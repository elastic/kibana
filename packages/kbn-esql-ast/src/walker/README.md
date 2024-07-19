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
