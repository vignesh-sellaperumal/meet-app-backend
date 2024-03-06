const app = require("express")();
const server = require("http").createServer(app);
const cors = require("cors");
const { SOCKET_EVENTS } = require("./utils/constants");

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());

const PORT = process.env.PORT || 8080;

let rooms = {};

io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
  socket.on(SOCKET_EVENTS.JOIN_ROOM, (roomID) => {
    if (rooms[roomID]) {
      if (rooms[roomID].length < 2) {
        rooms[roomID].push(socket.id);
        const otherUser = rooms[roomID].find((id) => id !== socket.id);
        if (otherUser) {
          socket.emit(SOCKET_EVENTS.OTHER_USER, otherUser);
          socket.emit(SOCKET_EVENTS.ROOM_FILLED, true);
          socket.to(otherUser).emit(SOCKET_EVENTS.USER_JOINED, socket.id);
        }
      }
    } else {
      rooms[roomID] = [socket.id];
    }
  });

  socket.on(SOCKET_EVENTS.OFFER, (payload) => {
    io.to(payload.target).emit(SOCKET_EVENTS.OFFER, payload);
  });

  socket.on(SOCKET_EVENTS.ANSWER, (payload) => {
    io.to(payload.target).emit(SOCKET_EVENTS.ANSWER, payload);
  });

  socket.on(SOCKET_EVENTS.ICE_CANDIDATE, (incoming) => {
    io.to(incoming.target).emit(
      SOCKET_EVENTS.ICE_CANDIDATE,
      incoming.candidate
    );
  });

  socket.on(SOCKET_EVENTS.TOGGLE_MIC, (payload) => {
    io.to(payload.target).emit(SOCKET_EVENTS.TOGGLE_MIC, payload.micStatus);
  });

  
  socket.on(SOCKET_EVENTS.TOGGLE_VIDEO, (payload) => {
    io.to(payload.target).emit(SOCKET_EVENTS.TOGGLE_VIDEO, payload.videoStatus);
  });

  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    let socketId = socket.id;
    Object.keys(rooms).forEach((roomId, index) => {
      if (rooms?.[roomId]?.includes(socketId)) {
        rooms[roomId] = rooms[roomId].filter((userId) => userId !== socketId);
        if (rooms[roomId] && rooms[roomId].length > 0) {
          socket.to(rooms[roomId][0]).emit(SOCKET_EVENTS.ROOM_FILLED, false);
          socket.to(rooms[roomId][0]).emit(SOCKET_EVENTS.USER_LEAVE);
        }
      }
    });
  });
});

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
