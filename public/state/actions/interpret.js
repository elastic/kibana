import { socketInterpreterProvider } from '../../../common/interpreter/socket_interpret';
import { fromExpression } from '../../../common/lib/ast';
import { socket } from '../../socket.js';
import { types } from '../../lib/type_registry';
import { clientFunctions } from '../../lib/function_registry';

// Create the function list
socket.emit('getFunctionList');
const getServerFunctions = new Promise((resolve) => socket.once('functionList', resolve));

export const expressionRun = (expression) => {
  return (/*dispatch, getState*/) => {
    const AST = fromExpression(expression);
    getServerFunctions.then((serverFunctionList) => {
      const interpret = socketInterpreterProvider({
        types: types,
        functions: clientFunctions,
        referableFunctions: serverFunctionList,
        socket: socket,
      });
      interpret(AST)
      .then(renderable => {
        console.log(renderable);
      });
    });
  };
};

window.ep = expressionRun;
