import { socketInterpreterProvider } from '../../common/interpreter/socket_interpret';
import { socket } from '../socket';
import { types } from './types';
import { functions } from './functions';
import { createHandlers } from './create_handlers';

// Create the function list
socket.emit('getFunctionList');
const getServerFunctions = new Promise((resolve) => socket.once('functionList', resolve));

// Use the above promise to seed the interpreter with the functions it can defer to
export function interpretAst(ast, context) {
  return getServerFunctions
  .then((serverFunctionList) => {
    return socketInterpreterProvider({
      types: types.toJS(),
      handlers: createHandlers(socket),
      functions: functions.toJS(),
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
