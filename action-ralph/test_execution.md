# Test execution guidance

Use this file when running validations that may take a long time (type-check, Scout, FTR, integration tests).

## Core pattern: background + short poll commands

Do not skip long-running checks. Start them once in the background, then poll with short commands.
Avoid a single long `while` loop command, because command runners often enforce a per-command timeout (~5 minutes).
Use workspace-local log files (for example `.action-ralph-runtime/session/`) and avoid `/tmp` paths, which may require extra permissions.

### 1) Start command once

```bash
RUN_DIR=".action-ralph-runtime/session"
mkdir -p "$RUN_DIR"
LOG_FILE="$RUN_DIR/ralph-check.log"
PID_FILE="$RUN_DIR/ralph-check.pid"
STATUS_FILE="$RUN_DIR/ralph-check.exit"
rm -f "$PID_FILE" "$STATUS_FILE"

( <your-command> > "$LOG_FILE" 2>&1; echo $? > "$STATUS_FILE" ) &
echo $! > "$PID_FILE"
```

### 2) Poll command (run repeatedly in separate calls)

```bash
RUN_DIR=".action-ralph-runtime/session"
LOG_FILE="$RUN_DIR/ralph-check.log"
PID_FILE="$RUN_DIR/ralph-check.pid"
STATUS_FILE="$RUN_DIR/ralph-check.exit"
CHECK_PID="$(cat "$PID_FILE")"

if kill -0 "$CHECK_PID" 2>/dev/null; then
  echo "[still running] $CHECK_PID"
  tail -n 40 "$LOG_FILE" || true
  exit 10
fi

echo "[completed] $CHECK_PID"
tail -n 80 "$LOG_FILE" || true
test -f "$STATUS_FILE" && cat "$STATUS_FILE"
```

Repeat the poll command until it reports completion. Treat `exit 10` as "still running" (not a failure).
For scoped type-check and functional tests in Kibana, allow up to ~15 minutes before treating as timeout unless logs show a hard failure.

## Scoped commands to prefer

- Type-check:
  - `yarn test:type_check --project <touched-tsconfig-path>`
- Jest unit:
  - `yarn test:jest <path-to-test-file>`
- Jest integration:
  - `yarn test:jest_integration <path-to-integration-test-file>`
- Scout:
  - `node scripts/scout.js run-tests --stateful --testFiles <spec-or-dir>`
- FTR:
  - `yarn test:ftr --config <path/to/config> --grep "<target-suite-or-test>"`

## FTR/Scout notes

- Avoid running broad suites; always target the smallest relevant test file/suite.
- Keep logs in files so failures are replayable and searchable.
- If a command takes much longer than expected, continue polling and only stop early if:
  - it clearly hangs with no output for a long period, or
  - there is an actionable fatal error in logs.
- Document in `## Additional Context`:
  - exact command(s),
  - log file path(s),
  - final pass/fail outcome.
