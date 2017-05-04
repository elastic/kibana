import { socketInterpreterProvider } from '../../../common/interpreter/socket_interpret';
import { fromExpression } from '../../../common/lib/ast';
import { socket } from '../../socket.js';
import { types } from '../../lib/type_registry';
import { clientFunctions } from '../../lib/function_registry';
import { getType } from '../../../common/types/get_type';

// Create the function list
socket.emit('getFunctionList');
const getServerFunctions = new Promise((resolve) => socket.once('functionList', resolve));

// Use the above promise to seed the interpreter with the functions it can defer to
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
  interpret(msg.ast, msg.context)
  .then(resp => {
    socket.emit('resp', { value: resp, id: msg.id });
  });
});

export const expressionRun = (expression) => {
  return (/*dispatch, getState*/) => {
    function run(exp, context) {
      const AST = fromExpression(exp);
      interpret(AST, context)
      .then(resp => {
        // If this is renderable, cool, do your thing
        if (getType(resp) === 'render') {
          console.log(resp);
        // Otherwise, cast it to a renderable
        } else {
          run('render()', resp);
        }
      });
    }
    run(expression);

  };
};

window.ep = expressionRun;
