# ES|QL AST Walker

The ES|QL AST Walker is a utility that traverses the ES|QL AST and provides a
set of callbacks that can be used to perform introspection of the AST.

To start a new *walk* you create a `Walker` instance and call the `walk()` method
with the AST node to start the walk from.

```ts

import { Walker, getAstAndSyntaxErrors } from '@kbn/esql-ast';

const walker = new Walker({
  // Called every time a function node is visited.
  visitFunction: (fn) => {
    console.log('Function:', fn.name);
  },
  // Called every time a source identifier node is visited.
  visitSource: (source) => {
    console.log('Source:', source.name);
  },
});

const { ast } = getAstAndSyntaxErrors('FROM source | STATS fn()');
walker.walk(ast);
```

Conceptual structure of an ES|QL AST:

- A single ES|QL query is composed of one or more source commands and zero or
  more transformation commands.
- Each command is represented by a `command` node.
- Each command contains a list expressions named in ES|QL AST as *AST Item*.
  - `function` &mdash; function call expression.
  - `option` &mdash; a list of expressions with a specific role in the command.
  - `source` &mdash; s source identifier expression.
  - `column` &mdash; a field identifier expression.
  - `timeInterval` &mdash; a time interval expression.
  - `list` &mdash; a list literal expression.
  - `literal` &mdash; a literal expression.
  - `inlineCast` &mdash; an inline cast expression.
