## High-level AST structure

Broadly, there are two AST node types: (1) commands (say `FROM ...`, like
*statements* in other languages), and (2) expressions (say `a + b`, or `fn()`).


### Commands

Commands in ES|QL are like *statements* in other languages. They are the top
level nodes in the AST.

The root node of the AST is considered to bye the "query" node. It contains a
list of commands.

```
Quey = Command[]
```

Each command receives a list of positional arguments. For example:

```
COMMAND arg1, arg2, arg3
```

A command may also receive additional lists of *named* arguments, we refer to
them as `option`s. For example:

```
COMMAND arg1, arg2, arg3 OPTION1 arg4, arg5 OPTION2 arg6, arg7
```

Essentially, one can of command arguments as a list of expressions, with the
ability to add named arguments to the command. For example, the above command
arguments can be represented as:

```js
{
  '': [arg1, arg2, arg3],
  'option1': [arg4, arg5],
  'option2': [arg6, arg7]
}
```

Each command has a command specific `visitCommandX` callback, where `X` is the
name of the command. If a command-specific callback is not found, the generic
`visitCommand` callback is called.


### Expressions

Expressions just like expressions in other languages. Expressions can be deeply
nested, as one expression can contain other expressions. For example, math
expressions `1 + 2`, function call expressions `fn()`, identifier expressions
`my.index` and so on.

As of this writing, the following expressions are defined:

- Source identifier expression, `{type: "source"}`, like `tsdb_index`
- Column identifier expression, `{type: "column"}`, like `@timestamp`
- Function call expression, `{type: "function"}`, like `fn(123)`
- Literal expression, `{type: "literal"}`, like `123`, `"hello"`
- List literal expression, `{type: "list"}`, like `[1, 2, 3]`, `["a", "b", "c"]`, `[true, false]`
- Time interval expression, `{type: "interval"}`, like `1h`, `1d`, `1w`
- Inline cast expression, `{type: "cast"}`, like `abc::int`, `def::string`
- Unknown node, `{type: "unknown"}`

Each expression has a `visitExpressionX` callback, where `X` is the type of the
expression. If a expression-specific callback is not found, the generic
`visitExpression` callback is called.
