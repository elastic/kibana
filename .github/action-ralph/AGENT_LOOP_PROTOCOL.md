# Agent loop protocol

You are executing a spec in an iterative, multi-session loop inside a GitHub Actions runner.

## Important paths and metadata
- **Spec file path**: Provided below - you MUST update this file after completing each task
- **GitHub username**: Provided below

## Required behavior
- Pick the **first unchecked** task in `## Tasks`.
- Implement **exactly one task** (including its acceptance checks).
- **Sandboxed environment:** You do NOT have access to `gh`, `git push`, or any GitHub API. You can only read and write local files. A separate publish phase handles all git operations, PR creation, and PR comments after you're done. Your job is to make the right code changes and update the spec.
- Update the spec file (at the path provided below):
  - Mark the task complete (`[x]`).
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
- Split tasks at context boundaries (investigate -> implement -> test).
- Don't split when steps share the same mental model and code context.

## Validation
- Run `yarn test:jest` on relevant test files to validate changes.
- If tests fail, iterate within the current session to fix them before marking done.

## Additional Context usage
Document in `## Additional Context`:
- File paths and functions discovered
- Decisions and rationale
- Gotchas found
- Working test commands
Write it like you're briefing a colleague who wasn't in the room.
