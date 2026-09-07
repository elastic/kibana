# ES|QL Language library

The general idea of this package is to provide comprehensive ES|QL functionality including low-level parsing,
building, traversal, pretty-printing, manipulation features on top of a custom compact AST representation, 
and advanced language features such as validation, autocomplete, hover, and signature help.

### Contents of the package

#### Core AST Functionality

At the lowest level, the package provides a parser that converts ES|QL text into
an AST representation. Or, you can use the `Builder` class to construct the AST
manually:

- [`parser` — Contains text to ES|QL AST parsing code](./src/parser/README.md)
- [`ast/builder` — Contains the `Builder` class for AST node construction](./src/ast/builder/README.md)

The _Traversal API_ lets you walk the AST. The `Walker` class is simple
to use, while the mutate utilities provide more powerful manipulation capabilities:

- [`ast/walker` — Contains the ES|QL AST `Walker` utility](./src/ast/walker/README.md)
- [`ast/mutate` — Contains code for traversing and mutating the AST](./src/ast/mutate/README.md)

The _Pretty-printing API_ lets you format the AST to text:

- [`pretty_print` — Contains code for formatting AST to text](./src/pretty_print/README.md)

#### Language Features

Advanced ES|QL language features including editor support:

- [`language` — Validation, autocomplete, hover, and signature help](./src/language/README.md)
  - `language/validation` — ES|QL query validation logic
  - `language/autocomplete` — Autocomplete and suggestion services
  - `language/hover` — Hover information providers
  - `language/signature_help` — Function signature assistance
  - `language/inline_suggestions` — Inline suggestion features

#### Commands and Query Building

The _Commands registry_ allows you to register and manage ES|QL commands:

- [`commands/registry` — Provides a centralized system for managing and interacting with ES|QL commands](./src/commands/registry/README.md)

The _Composer API_ provides a high-level, secure, and developer-friendly way to build ES|QL queries:

- [`composer` — ES|QL query composer with secure parameter handling and fluent API](./src/composer/README.md)

## Demo

Much of the functionality of this package is demonstrated in the demo UI. You
can run it in Storybook, using the following command:

```bash
yarn storybook esql_ast_inspector
```

Alternatively, you can start Kibana with _Example Plugins_ enabled, using:

```bash
yarn start --run-examples
```

Then navigate to the _ES|QL AST Inspector_ plugin in the Kibana UI.

## Keeping ES|QL AST library up to date

In general when operating on changes here use the `yarn kbn watch` in a terminal
window to make sure changes are correctly compiled.
