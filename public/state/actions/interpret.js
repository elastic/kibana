import { socketInterpreterProvider } from '../../../common/interpreter/socket_interpret';
import { fromExpression } from '../../../common/lib/ast';
import { socket } from '../../socket.js';
import { types } from '../../lib/type_registry';
import { clientFunctions } from '../../lib/function_registry';

// Create the function list
socket.emit('getFunctionList');
const getServerFunctions = new Promise((resolve) => socket.once('functionList', resolve));

function interpret(AST, context) {
  return getServerFunctions
  .then(serverFunctionList =>
    socketInterpreterProvider({
      types: types,
      functions: clientFunctions,
      referableFunctions: serverFunctionList,
      socket: socket,
    }))
  .then(interpretFn =>
    interpretFn(AST, context));
}


socket.on('run', (msg) => {
  console.log('got run', msg);

  interpret(msg.ast, msg.context)
  .then(resp => {
    socket.emit('resp', { value: resp, id: msg.id });
  });
});

export const expressionRun = (expression) => {
  return (/*dispatch, getState*/) => {
    const AST = fromExpression(expression);
    interpret(AST)
    .then(renderable => {
      console.log(renderable);
    });
  };
};

window.ep = expressionRun;
