# @kbn/esql-scripts

Home for the ES|QL definition and documentation generation scripts, plus the shared
utilities they rely on to extract ES|QL language definitions from an Elasticsearch repository.

This package has no public API; it is a dev-only collection of scripts.

## Layout

- `lib/` — internal helpers shared by the generators (reading/merging Elasticsearch definition files,
  clearing doc directives).
- `definitions/` — generate the ES|QL function, command and settings definitions consumed by
  `@kbn/esql-language`.
- `documentation/` — generate the inline ES|QL function and command docs consumed by
  `@kbn/language-documentation`.

The generators read input from a local Elasticsearch checkout and write their output back into the
`@kbn/esql-language` and `@kbn/language-documentation` packages.

## Usage

```sh
# from this package directory
yarn make:defs /path/to/elasticsearch   # function/command/settings definitions
yarn make:docs /path/to/elasticsearch   # inline function/command documentation
```
