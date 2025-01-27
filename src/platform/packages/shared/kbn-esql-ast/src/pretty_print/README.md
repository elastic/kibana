# Pretty-printing

*Pretty-printing* is the process of converting an ES|QL AST into a
human-readable string. This is useful for debugging or for displaying
the AST to the user.

This module provides a number of pretty-printing facilities. There are two
main classes that provide pretty-printing:

- `BasicPrettyPrinter` &mdash; provides the basic pretty-printing to a single
  line.
- `WrappingPrettyPrinter` &mdash; provides more advanced pretty-printing, which
  can wrap the query to multiple lines, and can also wrap the query to a
  specific width.


## `BasicPrettyPrinter`

The `BasicPrettyPrinter` class provides the simpler pretty-printing
functionality&mdash;it prints a query to a single line. Or, it can print a query
with each command on a separate line, with the ability to customize the
indentation before the pipe character.

Usage:

```typescript
import { parse, BasicPrettyPrinter } from '@kbn/esql-ast';

const src = 'FROM index | LIMIT 10';
const { root } = parse(src);
const text = BasicPrettyPrinter.print(root);

console.log(text); // FROM index | LIMIT 10
```

It can print each command on a separate line, with a custom indentation before
the pipe character:

```typescript
const text = BasicPrettyPrinter.multiline(root, { pipeTab: '  ' });
```

It can also print a single command to a single line; or an expression to a
single line. Below is the summary of the top-level functions:

- `BasicPrettyPrinter.print()` &mdash; prints query to a single line.
- `BasicPrettyPrinter.multiline()` &mdash; prints a query to multiple lines.
- `BasicPrettyPrinter.command()` &mdash; prints a command to a single line.
- `BasicPrettyPrinter.expression()` &mdash; prints an expression to a single
  line.

See `BasicPrettyPrinterOptions` for formatting options. For example, a
`lowercase` options allows you to lowercase all ES|QL keywords:

```typescript
const text = BasicPrettyPrinter.print(root, { lowercase: true });
```

The `BasicPrettyPrinter` prints only *left* and *right* multi-line comments,
which do not have line breaks, as this formatter is designed to print a query
to a single line. If you need to print a query to multiple lines, use the
`WrappingPrettyPrinter`.


## `WrappingPrettyPrinter`

The *wrapping pretty printer* can print a query to multiple lines, and can wrap
the text to a new line if the line width exceeds a certain threshold. It also
prints all comments attached to the AST (including ones that force the text
to be wrapped).

Usage:

```typescript
import { parse, WrappingPrettyPrinter } from '@kbn/esql-ast';

const src = `
  FROM index /* this is a comment */
  | LIMIT 10`;
const { root } = parse(src, { withFormatting: true });
const text = WrappingPrettyPrinter.print(root);
```

See `WrappingPrettyPrinterOptions` interface for available formatting options.

