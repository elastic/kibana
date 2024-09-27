# ES|QL AST library

The general idea of this package is to provide low-level ES|QL parsing,
building, traversal, pretty-printing, and manipulation features on top of a
custom compact AST representation, which is designed to be resilient to many
grammar changes.

Contents of this package:

- [`builder` &mdash; Contains the `Builder` class for AST node construction](./src/builder/README.md).
- [`parser` &mdash; Contains text to ES|QL AST parsing code](./src/parser/README.md).
- [`walker` &mdash; Contains the ES|QL AST `Walker` utility](./src/walker/README.md).
- [`visitor` &mdash; Contains the ES|QL AST `Visitor` utility](./src/visitor/README.md).
- [`pretty_print` &mdash; Contains code for formatting AST to text](./src/pretty_print/README.md).


## Keeping ES|QL AST library up to date

In general when operating on changes here use the `yarn kbn watch` in a terminal
window to make sure changes are correctly compiled.
