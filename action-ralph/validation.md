# Validation guidance

## Core rules

- Always run selective validation for touched code; do not run all tests.
- Pipe large test output to files so failures are searchable/replayable.
- Actually execute validation before finalizing work.
- For long-running validations, follow `action-ralph/test_execution.md` (background + poll + wait, do not skip).

## Unit tests

```bash
yarn test:jest <path-to-test-file>
```

- If Jest prints `Jest did not exit one second after the test run has completed`, it's usually an open handles warning (unresolved timers, subscriptions). A passing exit code is still acceptable if the leak is unrelated to your change — document it in Additional Context.
- If actionable, rerun with `--detectOpenHandles` and fix the leak.
- Route-handler test pattern: extract business logic into testable functions, use dependency injection for external services (e.g. ES client), co-locate tests with source files.

### Jest gotchas

- `jest.mock('<module>', factory)` factories are hoisted and must not reference out-of-scope variables (including imported bindings like `React`). Use `jest.requireActual('react')` inside the factory.
- If using Jest fake timers, always restore real timers and clear pending timers in `afterEach`.
- Use deterministic test isolation and cleanup in setup/teardown.
- Ensure component tests unmount/close overlays and async work settles to avoid open handles.

## Lint and type-check

Always run `node scripts/check_changes.ts` to validate your changes against the repo's baseline gate.

Run checks only for touched projects/packages:

```bash
# Baseline validation gate
node scripts/check_changes.ts

# Lint
node scripts/eslint.js <touched-path> --fix

# Type-check (scoped to one project)
yarn test:type_check --project <touched-tsconfig-path>

# i18n (only when user-facing strings changed)
node scripts/i18n_check.js --fix
```

- Do not run repo-wide lint/type-check unless the task requires it.
- If scoped lint/type-check fails with dependency/project-map errors after switching branches, run `yarn kbn bootstrap` and retry.
- Type-check can take a while on larger projects. If it runs longer than expected, pipe output to a file and check periodically.
- Do not skip long-running scoped type-check commands. Use the timeout-safe pattern from `action-ralph/test_execution.md` (start command once, then poll in separate short commands).

Example:

```bash
RUN_DIR=".action-ralph-runtime/session"
mkdir -p "$RUN_DIR"
LOG_FILE="$RUN_DIR/ralph-typecheck.log"
PID_FILE="$RUN_DIR/ralph-typecheck.pid"
STATUS_FILE="$RUN_DIR/ralph-typecheck.exit"
rm -f "$PID_FILE" "$STATUS_FILE"

( yarn test:type_check --project <touched-tsconfig-path> > "$LOG_FILE" 2>&1; echo $? > "$STATUS_FILE" ) &
echo $! > "$PID_FILE"

# Poll this in separate short commands until complete:
TYPECHECK_PID="$(cat "$PID_FILE")"
if kill -0 "$TYPECHECK_PID" 2>/dev/null; then
  echo "[type-check still running] $TYPECHECK_PID"
  tail -n 40 "$LOG_FILE" || true
  exit 10
fi
echo "[type-check completed] $TYPECHECK_PID"
tail -n 80 "$LOG_FILE" || true
cat "$STATUS_FILE"
```

## Long-running functional tests (Scout/FTR)

- Use scoped test targets only (specific file/suite/config), never broad full-suite runs unless required.
- Run long commands in the background with log file polling as documented in `action-ralph/test_execution.md`.
- Common commands:

```bash
# Scout
node scripts/scout.js run-tests --stateful --testFiles <spec-or-dir>

# FTR
yarn test:ftr --config <path/to/config> --grep "<target-suite-or-test>"
```

- Record command, log file path, and final pass/fail outcome in `## Additional Context`.

### Type-check caveats

- Scoped `yarn test:type_check --project <tsconfig>` can still fail due to referenced TS projects elsewhere in the repo. Treat as repo-level unless your task explicitly owns fixing those.
- Some bootstrap/type-check flows generate untracked `*.d.ts` artifacts (often under `src/platform/packages/shared/kbn-std/`). Don't include these in your changes unless your task is about generated types.
