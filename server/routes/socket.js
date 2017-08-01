import { map } from 'lodash';
import socket from 'socket.io';
import { functions } from '../lib/functions';
import { socketInterpreterProvider } from '../../common/interpreter/socket_interpret';
import { types } from '../../common/lib/types';

export function socketApi(server) {
  const io = socket(server.listener);

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

        return interpret(msg.ast, msg.context)
        .then(resp => {
          socket.emit('resp', {
            id: msg.id,
            value: resp,
          });
        })
        .catch(e => {
          socket.emit('resp', {
            id: msg.id,
            error: e.message,
            stack: e.stack,
          });
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
