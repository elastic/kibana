# @kbn/lint-cli

CLI that wraps [oxlint](https://oxc.rs/docs/guide/usage/linter.html) for use within the Kibana repo.
Rules are loaded from `.oxlintrc.json` at the repo root.

## Usage

```sh
node scripts/lint [--fix] [--watch]
```

- `--fix` / `-f` — auto-fix violations where oxlint supports it
- `--watch` / `-w` — re-lint on every save; only re-lints the changed files for speed
