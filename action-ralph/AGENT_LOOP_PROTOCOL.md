# Agent loop protocol

You are executing a spec in an iterative, multi-session loop inside a GitHub Actions runner.

## Important paths and metadata
- **Spec file path**: Provided below - you MUST update this file after completing each task
- **GitHub username**: Provided below
- **Reference files**: Located in `action-ralph/` - read these for detailed guidance

## Required behavior
- Pick the **first unchecked** task in `## Tasks`.
- Implement **exactly one task** (including its acceptance checks).
- **Sandboxed environment:** You do NOT have access to `gh`, `git push`, or any GitHub API. You can only read and write local files. A separate publish phase handles all git operations, PR creation, and PR comments after you're done. Your job is to make the right code changes and update the spec.
- Update the spec file (at the path provided below):
  - Mark the task complete (`[x]`).
  - Maintain `## PR title` with a concise, reviewer-friendly title (target <= 72 chars) that describes the implemented change.
  - Maintain `## PR summary` with 2-4 concise bullets focused on what changed and why (not the raw prompt).
  - Append discoveries/gotchas to `## Additional Context`.
  - Adjust remaining tasks if reality differs (split/merge/reword as needed).
  - Update `## Status`:
    - `in-progress` when the first implementation task begins
    - `done` only when the spec's "Definition of done" is met (and all tasks needed to satisfy it are complete)
    - `aborted` if the task cannot be completed (explain why in Additional Context)
- Exit after updating the spec so the next fresh session can continue.

## Task design
- Each task runs in a **separate session with fresh context**. You have no memory of previous sessions.
- Only the spec file and `## Additional Context` carry information forward.
- **Split when:** exploration needs to happen before implementation, or you're switching work types (investigate -> implement -> test).
- **Don't split when:** steps share the same mental model and code context, or splitting means re-reading the same code repeatedly.
- **Right-sized tasks:** "Investigate and document findings", "Implement with unit tests", "Add integration tests, iterate until passing".
- **Too granular:** "Open file X", "Find function Y", "Add parameter Z" (wastes sessions re-establishing context).
- **Too coarse:** "Fix all the bugs" (can't complete in one session).

## Validation

Read `action-ralph/validation.md` for the full checklist. Key rules:

- Always run selective validation for touched code; do not run all tests.
- Pipe large test output to files so failures are searchable/replayable.
- Actually execute validation before marking a task done.
- For long-running checks (type-check, Scout, FTR, integration tests), follow `action-ralph/test_execution.md` and use background + poll + wait.

### Unit tests
```bash
yarn test:jest <path-to-test-file>
```
- If Jest prints "did not exit one second after test run completed", it's usually open handles. Passing exit code is acceptable if unrelated to your change.
- Route-handler tests: extract business logic into testable functions, use dependency injection.

### Lint and type-check (only for touched files)
```bash
node scripts/eslint.js <touched-path> --fix
yarn test:type_check --project <touched-tsconfig-path>
```
- Do NOT run repo-wide lint/type-check unless the task requires it.
- If type-check fails with project-map errors after branch changes, run `yarn kbn bootstrap` and retry.
- Some bootstrap/type-check flows create untracked `*.d.ts` artifacts — don't include them in your changes.
- If a scoped type-check may run for a long time, do not skip it. Use the timeout-safe pattern from `action-ralph/test_execution.md` (start once, poll in separate short commands). Example:
```bash
RUN_DIR=".action-ralph-runtime/session"
mkdir -p "$RUN_DIR"
LOG_FILE="$RUN_DIR/ralph-typecheck.log"
PID_FILE="$RUN_DIR/ralph-typecheck.pid"
STATUS_FILE="$RUN_DIR/ralph-typecheck.exit"
rm -f "$PID_FILE" "$STATUS_FILE"

( yarn test:type_check --project <touched-tsconfig-path> > "$LOG_FILE" 2>&1; echo $? > "$STATUS_FILE" ) &
echo $! > "$PID_FILE"

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
- Use realistic validation time budgets: allow scoped type-check / functional tests to run up to ~15 minutes before timing out, unless logs show a clear fatal failure earlier.

## Kibana-specific gotchas

Read `action-ralph/lessons_learned.md` for the full list. Critical items:

- Avoid `@kbn/<pkg>/src/...` subpath imports. Use public package entrypoints only.
- `jest.mock()` factories are hoisted — don't reference out-of-scope variables; use `jest.requireActual()` inside the factory.
- Use deterministic test isolation and cleanup in setup/teardown.
- If using Jest fake timers, always restore real timers in `afterEach`.

## Self-review task

The spec includes a final "Self-review" task. When you reach it:

1. **Start fresh** — treat the changes as if someone else wrote them. You have no memory of previous sessions.
2. **Read the full diff** — run `git diff` and read every changed file end-to-end. Don't skim.
3. **Evaluate against these criteria:**
   - Best practices for the codebase (naming, patterns, imports, error handling)
   - Code cleanliness — no leftover debug code, TODOs from the agent, commented-out code, or unnecessary changes
   - Correctness — logic bugs, unhandled edge cases, missed requirements from the original prompt
   - Consistency — naming, formatting, and style match the surrounding code
   - Test coverage — are the changes adequately tested? Are tests meaningful (not just asserting `true`)?
4. **Fix issues** — apply code fixes directly. This is not a read-only review.
5. **Re-validate** — if you made any fixes, re-run the relevant local checks (jest for touched test files, eslint for touched source files, scoped type-check if types changed). Follow the same validation guidance as implementation tasks.
6. **Document findings** — record what you reviewed and any fixes applied in `## Additional Context`. If everything looked good, say so explicitly.

The self-review must always be the **last task** before setting status to `done`. If the planning task adds more implementation tasks, keep the self-review at the end.

## Additional Context usage
Document in `## Additional Context`:
- File paths and functions discovered
- Decisions and rationale
- Gotchas found
- Working test commands

Write it like you're briefing a colleague who wasn't in the room.
