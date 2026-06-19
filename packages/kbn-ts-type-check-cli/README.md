# @kbn/ts-type-check-cli

Backs `node scripts/type_check`. Generates per-project `tsconfig.type_check.json`
files and drives `tsgo -b` (the native TypeScript compiler) over the selected
projects.

## Tuning build concurrency

`tsgo -b` is an orchestrator: `--builders` projects build in parallel and each
runs up to `--checkers` type-checkers, so peak parallelism/memory is roughly
`builders * checkers`. The defaults derive from the host core count (builders =
`min(cores, 16)`, checkers = 2) and can be overridden per environment:

- `KBN_TYPE_CHECK_BUILDERS` — projects built concurrently.
- `KBN_TYPE_CHECK_CHECKERS` — type-checkers per project.
- `KBN_TYPE_CHECK_STOP_ON_ERRORS` — `true`/`1` to pass `--stopBuildOnErrors`.
- `KBN_TYPE_CHECK_MAX_OLD_SPACE_MB` — Node heap budget for the tsgo process
  (default 12288).

These let a larger CI machine profile use more parallelism (and heap) without a
code change.
