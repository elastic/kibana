import { functions } from '../lib/functions';
import { map } from 'lodash';
import { socketInterpreterProvider } from '../../common/interpreter/socket_interpret';
import { types } from '../../common/lib/types';

export function socketApi(server) {
  const io = require('socket.io')(server.listener);
  io.on('connection', (socket) => {
    console.log('User connected, attaching handlers');

    // Create the function list
    socket.emit('getFunctionList');
    const getClientFunctions = new Promise((resolve) => socket.once('functionList', resolve));

    socket.on('getFunctionList', () => {
      socket.emit('functionList', map(functions.toJS(), 'name'));
    });

    const handler = (msg) => {
      getClientFunctions.then((clientFunctions) => {
        const interpret = socketInterpreterProvider({
          types: types.toJS(),
          functions: functions.toJS(),
          referableFunctions: clientFunctions,
          socket: socket,
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

    socket.on('run', handler);
    socket.on('disconnect', () => {
      console.log('User disconnected, removing handlers.');
      socket.removeListener('run', handler);
    });


  });
}
