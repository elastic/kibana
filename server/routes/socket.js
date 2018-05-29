import socket from 'socket.io';
import { createHandlers } from '../lib/create_handlers';
import { socketInterpreterProvider } from '../../common/interpreter/socket_interpret';
import { serializeProvider } from '../../common/lib/serialize';
import { functionsRegistry } from '../../common/lib/functions_registry';
import { typesRegistry } from '../../common/lib/types_registry';
import { getAuthHeader } from './get_auth/get_auth_header';

export function socketApi(server) {
  const config = server.config();
  const socketPathPrefix =
    config.has('server.rewriteBasePath') && config.get('server.rewriteBasePath')
      ? config.get('server.basePath')
      : '';
  const socketPath = `${socketPathPrefix}/socket.io`;
  const io = socket(server.listener, { path: socketPath });

  io.on('connection', socket => {
    console.log('User connected, attaching handlers');

    // This is the HAPI request object
    const request = socket.handshake;

    const authHeader = getAuthHeader(request, server);

    // Create the function list
    socket.emit('getFunctionList');
    const getClientFunctions = new Promise(resolve => socket.once('functionList', resolve));

    socket.on('getFunctionList', () => {
      socket.emit('functionList', functionsRegistry.toJS());
    });

    const handler = ({ ast, context, id }) => {
      Promise.all([getClientFunctions, authHeader]).then(([clientFunctions, authHeader]) => {
        if (server.plugins.security) request.headers.authorization = authHeader;

        const types = typesRegistry.toJS();
        const interpret = socketInterpreterProvider({
          types,
          functions: functionsRegistry.toJS(),
          handlers: createHandlers(request, server),
          referableFunctions: clientFunctions,
          socket: socket,
        });

        const { serialize, deserialize } = serializeProvider(types);
        return interpret(ast, deserialize(context))
          .then(value => {
            socket.emit(`resp:${id}`, { value: serialize(value) });
          })
          .catch(e => {
            socket.emit(`resp:${id}`, {
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
