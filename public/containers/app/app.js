import React from 'react';
import { clientFunctions } from '../../lib/function_registry';
// Now we need some way to find out about server functions?
import { types } from '../../lib/type_registry';
import interpretProvider from '../../../common/interpreter/interpret';

const interpret = interpretProvider({
  functions: clientFunctions,
  types: types,
  onFunctionNotFound: (ast, context) => {
    console.log(ast, context);
  }
});

import '../../state/actions/interpret';

export function App() {
  interpret({
    type: 'expression',
    chain: [{
      type: 'function',
      function: 'clientdata',
      arguments: {}
    }]
  }).then(console.log).catch(console.log);

  return (
    <div>
      Foo
    </div>
  );
}
