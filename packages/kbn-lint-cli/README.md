# @kbn/lint-cli

CLI that wraps [oxlint](https://oxc.rs/docs/guide/usage/linter.html) for use within the Kibana repo.
Rules are loaded from `.oxlintrc.json` at the repo root.

## Usage

```sh
node scripts/lint [paths...] [--fix] [--watch]
```

- `paths` — optional list of paths to lint; defaults to the whole repo
- `--fix` / `-f` — auto-fix violations where oxlint supports it
- `--watch` / `-w` — re-lint on every save; scoped to `paths` when provided

## Examples

```sh
# lint the whole repo
node scripts/lint

# lint a single package
node scripts/lint packages/kbn-lint-cli/

# lint multiple paths, auto-fixing
node scripts/lint src/platform/ x-pack/solutions/security/ --fix

# watch a single package
node scripts/lint packages/kbn-lint-cli/ --watch
```
