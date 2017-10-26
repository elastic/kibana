import { socketInterpreterProvider } from '../../common/interpreter/socket_interpret';
import { socket } from '../socket';
import { createHandlers } from './create_handlers';
import { typesRegistry } from '../../common/lib/types_registry';
import { functionsRegistry } from './functions_registry';

// Create the function list
socket.emit('getFunctionList');
const getServerFunctions = new Promise((resolve) => socket.once('functionList', resolve));

// Use the above promise to seed the interpreter with the functions it can defer to
export function interpretAst(ast, context) {
  return getServerFunctions
  .then((serverFunctionList) => {
    return socketInterpreterProvider({
      types: typesRegistry.toJS(),
      handlers: createHandlers(socket),
      functions: functionsRegistry.toJS(),
      referableFunctions: serverFunctionList,
      socket: socket,
    });
  })
  .then(interpretFn => interpretFn(ast, context));
}

socket.on('run', (msg) => {
  interpretAst(msg.ast, msg.context)
  .then(resp => {
    socket.emit('resp', { value: resp, id: msg.id });
  });
});
