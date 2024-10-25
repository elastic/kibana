# `Visitor` Traversal API

The `Visitor` traversal API provides a feature-rich way to traverse the ES|QL
AST. It is more powerful than the [`Walker` API](../walker/README.md), as it
allows to traverse the AST in a more flexible way.

The `Visitor` API allows to traverse the AST starting from the root node or a
command statement, or an expression. Unlike in the `Walker` API, the `Visitor`
does not automatically traverse the entire AST. Instead, the developer has to
manually call the necessary *visit* methods to traverse the AST. This allows
to traverse the AST in a more flexible way: only traverse the parts of the AST
that are needed, or maybe traverse the AST in a different order, or multiple
times.

The `Visitor` API is also more powerful than the `Walker` API, as for each
visitor callback it provides a *context* object, which contains the information
about the current node as well as the parent node, and the whole parent chain
up to the root node.

In addition, each visitor callback can return a value (*output*), which is then
passed to the parent node, in the place where the visitor was called. Also, when
a child is visited, the parent node can pass in *input* to the child visitor.


## About ES|QL AST structure

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
- List literal expression, `{type: "list"}`, like `[1, 2, 3]`,
  `["a", "b", "c"]`, `[true, false]`
- Time interval expression, `{type: "interval"}`, like `1h`, `1d`, `1w`
- Inline cast expression, `{type: "cast"}`, like `abc::int`, `def::string`
- Unknown node, `{type: "unknown"}`

Each expression has a `visitExpressionX` callback, where `X` is the type of the
expression. If a expression-specific callback is not found, the generic
`visitExpression` callback is called.


## `Visitor` API Usage

The `Visitor` API is used to traverse the AST. The process is as follows:

1. Create a new `Visitor` instance.
2. Register callbacks for the nodes you are interested in.
3. Call the `visitQuery`, `visitCommand`, or `visitExpression` method to start
   the traversal.

For example, the below code snippet prints the type of each expression node:

```typescript
new Visitor()
  .on('visitExpression', (ctx) => console.log(ctx.node.type))
  .on('visitCommand', (ctx) => [...ctx.visitArguments()])
  .on('visitQuery', (ctx) => [...ctx.visitCommands()])
  .visitQuery(root);
```

In the `visitQuery` callback it visits all commands, using the `visitCommands`.
In the `visitCommand` callback it visits all arguments, using the
`visitArguments`. And finally, in the `visitExpression` callback it prints the
type of the expression node.

Above we started the traversal from the root node, using the `.visitQuery(root)`
method. However, one can start the traversal from any node, by calling the
following methods:

- `.visitQuery()` &mdash; Start traversal from the root node.
- `.visitCommand()` &mdash; Start traversal from a command node.
- `.visitExpression()` &mdash; Start traversal from an expression node.


### Specifying Callbacks

The simplest way to traverse the AST is to specify the below three callbacks:

- `visitQuery` &mdash; Called for every query node. (Normally once.)
- `visitCommand` &mdash; Called for every command node.
- `visitExpression` &mdash; Called for every expression node.


However, you can be more specific and specify callbacks for commands and
expression types. This way the context `ctx` provided to the callback will have
helpful methods specific to the node type.

When a more specific callback is not found, the generic `visitCommand` or
`visitExpression` callbacks are not called for that node.

You can specify a specific callback for each command, instead of the generic
`visitCommand`:

- `visitFromCommand` &mdash; Called for every `FROM` command node.
- `visitLimitCommand` &mdash; Called for every `LIMIT` command node.
- `visitExplainCommand` &mdash; Called for every `EXPLAIN` command node.
- `visitRowCommand` &mdash; Called for every `ROW` command node.
- `visitMetricsCommand` &mdash; Called for every `METRICS` command node.
- `visitShowCommand` &mdash; Called for every `SHOW` command node.
- `visitMetaCommand` &mdash; Called for every `META` command node.
- `visitEvalCommand` &mdash; Called for every `EVAL` command node.
- `visitStatsCommand` &mdash; Called for every `STATS` command node.
- `visitInlineStatsCommand` &mdash; Called for every `INLINESTATS` command node.
- `visitLookupCommand` &mdash; Called for every `LOOKUP` command node.
- `visitKeepCommand` &mdash; Called for every `KEEP` command node.
- `visitSortCommand` &mdash; Called for every `SORT` command node.
- `visitWhereCommand` &mdash; Called for every `WHERE` command node.
- `visitDropCommand` &mdash; Called for every `DROP` command node.
- `visitRenameCommand` &mdash; Called for every `RENAME` command node.
- `visitDissectCommand` &mdash; Called for every `DISSECT` command node.
- `visitGrokCommand` &mdash; Called for every `GROK` command node.
- `visitEnrichCommand` &mdash; Called for every `ENRICH` command node.
- `visitMvExpandCommand` &mdash; Called for every `MV_EXPAND` command node.

Similarly, you can specify a specific callback for each expression type, instead
of the generic `visitExpression`:

- `visitColumnExpression` &mdash; Called for every column expression node, say
  `@timestamp`.
- `visitSourceExpression` &mdash; Called for every source expression node, say
  `tsdb_index`.
- `visitFunctionCallExpression` &mdash; Called for every function call
  expression node. Including binary expressions, such as `a + b`.
- `visitLiteralExpression` &mdash; Called for every literal expression node, say
  `123`, `"hello"`.
- `visitListLiteralExpression` &mdash; Called for every list literal expression
  node, say `[1, 2, 3]`, `["a", "b", "c"]`.
- `visitTimeIntervalLiteralExpression` &mdash; Called for every time interval
  literal expression node, say `1h`, `1d`, `1w`.
- `visitInlineCastExpression` &mdash; Called for every inline cast expression
  node, say `abc::int`, `def::string`.
- `visitRenameExpression` &mdash; Called for every rename expression node, say
  `a AS b`.
- `visitOrderExpression` &mdash; Called for every order expression node, say
  `@timestamp ASC`.


### Using the Node Context

Each visitor callback receives a `ctx` object, which contains the reference to
the parent node's context:

```typescript
new Visitor()
  .on('visitExpression', (ctx) => {
    ctx.parent
  });
```

Each visitor callback also contains various methods to visit the children nodes,
if needed. For example, to visit all arguments of a command node:

```typescript
const expressions = [];

new Visitor()
  .on('visitExpression', (ctx) => expressions.push(ctx.node));
  .on('visitCommand', (ctx) => {
    for (const output of ctx.visitArguments()) {
    }
  });
```

The node context object may also have node specific methods. For example, the
`LIMIT` command context has the `.numeric()` method, which returns the numeric
value of the `LIMIT` command:

```typescript
new Visitor()
  .on('visitLimitCommand', (ctx) => {
    console.log(ctx.numeric());
  })
  .on('visitCommand', () => null)
  .on('visitQuery', (ctx) => [...ctx.visitCommands()])
  .visitQuery(root);
```


### Using the Visitor Output

Each visitor callback can return a *output*, which is then passed to the parent
callback. This allows to pass information from the child node to the parent
node.

For example, the below code snippet collects all column names in the AST:

```typescript
const columns = new Visitor()
  .on('visitExpression', (ctx) => null)
  .on('visitColumnExpression', (ctx) => ctx.node.name)
  .on('visitCommand', (ctx) => [...ctx.visitArguments()])
  .on('visitQuery', (ctx) => [...ctx.visitCommands()])
  .visitQuery(root);
```


### Using the Visitor Input

Analogous to the output, each visitor callback can receive an *input* value.
This allows to pass information from the parent node to the child node.

For example, the below code snippet prints all column names prefixed with the
text `"prefix"`:

```typescript
new Visitor()
  .on('visitExpression', (ctx) => null)
  .on('visitColumnExpression', (ctx, INPUT) => console.log(INPUT + ctx.node.name))
  .on('visitCommand', (ctx) => [...ctx.visitArguments("prefix")])
  .on('visitQuery', (ctx) => [...ctx.visitCommands()])
  .visitQuery(root);
``` 
