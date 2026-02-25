# Test execution guidance

Use this file when running validations that may take a long time (type-check, Scout, FTR, integration tests).

## Core pattern: background + poll + wait

Do not skip long-running checks. Run them in the background, write output to a log file, poll status, then `wait` for final exit code.

```bash
LOG_FILE="/tmp/ralph-check.log"
<your-command> > "$LOG_FILE" 2>&1 &
CHECK_PID=$!

while kill -0 "$CHECK_PID" 2>/dev/null; do
  sleep 10
  echo "[still running] $CHECK_PID"
  tail -n 40 "$LOG_FILE" || true
done

wait "$CHECK_PID"
```

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
