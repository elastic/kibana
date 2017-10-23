import { map } from 'lodash';
import socket from 'socket.io';
import { functionsRegistry } from '../../common/lib/functions';
import { socketInterpreterProvider } from '../../common/interpreter/socket_interpret';
import { typesRegistry } from '../../common/lib/types';
import { createHandlers } from '../lib/create_handlers';

export function socketApi(server) {
  const io = socket(server.listener);

  io.on('connection', (socket) => {
    console.log('User connected, attaching handlers');

    // Create the function list
    socket.emit('getFunctionList');
    const getClientFunctions = new Promise((resolve) => socket.once('functionList', resolve));

    socket.on('getFunctionList', () => {
      socket.emit('functionList', map(functionsRegistry.toJS(), 'name'));
    });

    const handler = (msg) => {
      getClientFunctions.then((clientFunctions) => {
        const interpret = socketInterpreterProvider({
          types: typesRegistry.toJS(),
          functions: functionsRegistry.toJS(),
          handlers: createHandlers(socket, server),
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
