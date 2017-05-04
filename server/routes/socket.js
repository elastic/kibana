import { serverFunctions } from '../lib/function_registry';
import { map } from 'lodash';
import { socketInterpreterProvider } from '../../common/interpreter/socket_interpret';
import { types } from '../../common/lib/type_registry';


export function socketApi(server) {
  const io = require('socket.io')(server.listener);
  io.on('connection', (socket) => {
    console.log('User connected, attaching handlers');

    // Create the function list
    socket.emit('getFunctionList');
    const getServerFunctions = new Promise((resolve) => socket.once('functionList', resolve));

    const handler = (msg) => {
      getServerFunctions.then((clientFunctions) => {
        const interpret = socketInterpreterProvider({
          types: types,
          functions: serverFunctions,
          referableFunctions: clientFunctions,
          socket: socket
        });

        interpret(msg.ast, msg.context)
          .then(resp => {
            socket.emit('resp', { value: resp, id: msg.id });
          })
          .catch(e => {
            socket.emit('resp', { error: e, id: msg.id });
          });
      });
    };

    socket.on('disconnect', () => {
      console.log('User disconnected, removing handlers.');
      socket.removeListener('run', handler);
    });

    socket.on('run', handler);

    socket.on('getFunctionList', () => {
      socket.emit('functionList', map(serverFunctions, 'name'));
    });
  });
}
