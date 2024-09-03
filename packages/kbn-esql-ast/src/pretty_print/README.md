# Pretty-printing

*Pretty-printing* is the process of converting an ES|QL AST into a
human-readable string. This is useful for debugging or for displaying
the AST to the user.

This module provides a number of pretty-printing options.


## `BasicPrettyPrinter`

The `BasicPrettyPrinter` class provides the most basic pretty-printing&mdash;it
prints a query to a single line. Or it can print a query with each command on
a separate line, with the ability to customize the indentation before the pipe
character.

It can also print a single command to a single line; or an expression to a
single line.

- `BasicPrettyPrinter.print()` &mdash; prints query to a single line.
- `BasicPrettyPrinter.multiline()` &mdash; prints a query to multiple lines.
- `BasicPrettyPrinter.command()` &mdash; prints a command to a single line.
- `BasicPrettyPrinter.expression()` &mdash; prints an expression to a single line.
