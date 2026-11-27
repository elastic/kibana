# @kbn/lint-cli

CLI that wraps [oxlint](https://oxc.rs/docs/guide/usage/linter.html) for use within the Kibana repo.
Rules are loaded from `oxlint.config.mjs` at the repo root, which loads the typed config in `.oxlint/index.mts`.

## Usage

```sh
node scripts/lint [paths...] [--fix] [--watch]
```

- `paths` — optional list of paths to lint; defaults to the whole repo. A whole-repo run (without `--watch`) is split across several oxlint processes, because JS plugin rules run on a single thread per process; each process's output is printed as one block. It lints in two passes, set with `OXLINT_PASS` (see `.oxlint/passes.mts`): every rule except oxlint's native import plugin, then the import plugin rules on their own, because the import plugin's memory would otherwise limit how many processes fit on a CI agent.
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
