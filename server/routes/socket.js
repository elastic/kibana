import { map } from 'lodash';
import socket from 'socket.io';
import { getAuthHeader } from './get_auth/get_auth_header';
import { createHandlers } from '../lib/create_handlers';
import { socketInterpreterProvider } from '../../common/interpreter/socket_interpret';
import { functionsRegistry } from '../../common/lib/functions_registry';
import { typesRegistry } from '../../common/lib/types_registry';

export function socketApi(server) {
  const io = socket(server.listener);

  io.on('connection', (socket) => {
    console.log('User connected, attaching handlers');

    // This is the HAPI request object
    const request = socket.handshake;

    const authHeader = getAuthHeader(request, server);

    // Create the function list
    socket.emit('getFunctionList');
    const getClientFunctions = new Promise((resolve) => socket.once('functionList', resolve));

    socket.on('getFunctionList', () => {
      socket.emit('functionList', map(functionsRegistry.toJS(), 'name'));
    });

    const handler = (msg) => {
      Promise.all([
        getClientFunctions,
        authHeader,
      ])
      .then(([
        clientFunctions,
        authHeader,
      ]) => {
        if (server.plugins.security) request.headers.authorization = authHeader;

        const interpret = socketInterpreterProvider({
          types: typesRegistry.toJS(),
          functions: functionsRegistry.toJS(),
          handlers: createHandlers(request, server),
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
