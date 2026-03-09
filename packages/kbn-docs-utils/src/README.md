# Auto-generated API documentation.

[RFC](https://github.com/elastic/kibana/blob/main/legacy_rfcs/text/0014_api_documentation.md)

This package builds and validates API documentation for Kibana plugins and packages. Use `node scripts/build_api_docs` to emit docs to `api_docs/`, or `node scripts/check_package_docs` to validate JSDoc without writing files.

## CLI commands

### Build API docs (`node scripts/build_api_docs`)
- Generates docs into `api_docs/` using [`src/build_api_docs_cli.ts`](./build_api_docs_cli.ts).
- `--plugin <id>` limits to a single plugin or package; `--package` is an alias.
- `--references` collects references for API items.
- `--stats <any|comments|exports>` is deprecated and routes validation to `check_package_docs` without writing docs.

### Check package docs (`node scripts/check_package_docs`)
- Runs validation only (no docs written) via [`src/check_package_docs_cli.ts`](./check_package_docs_cli.ts); output folder is `api_docs_check/`.
- `--plugin <id>` and `--package <id>` filter targets; omit to check all plugins.
- `--check <any|comments|exports|all>` selects checks; defaults to `all` (equivalent to `any`, `comments`, and `exports`).
- Multiple `--check` flags combine checks.
- Exits with a non-zero code if any selected checks fail.

## Validation rules
- `any` check: fails when API declarations use `any` (`TypeKind.AnyKind`).
- `comments` check: fails when descriptions are missing for API items.
- `exports` check: fails when public API items are missing from plugin exports discovered during analysis.
- Third-party code under `node_modules/` is ignored for validation.
