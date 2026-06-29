# Split plan schema

Write `split-plan-<slug>.md` following this schema. Definitions: [review.md](review.md). Execution: [execution.md](execution.md).

**Phase 3 self-check:** every PR block has all 7 fields below.

## Stack-level sections

1. **Header table** — baseline (`upstream/main`), branch, date, plan path, single chain note
2. **Feature context** — 1–2 sentences; design reviewed
3. **Hotspots** — omit if none; file, issue, resolution
4. **Ownership map** — team, files summary, PR #, primary reviewer
5. **Summary table** — PR #, title, review question, bucket, risk tags, attention, file count, merge priority, depends on
6. **Stack mermaid** + suggested merge order (foundations vs behavioral)
7. **Per-PR blocks** — repeat for each PR
8. **Leftover / deferred** — omit if empty
9. **NEEDS DECISION** — omit if empty
10. **Splittability edits summary** — stack-level code not in current diff; omit if none

Bucket, attention, merge priority, depends-on live in **Summary** only—not duplicated per PR.

## Per-PR block (7 fields)

Each PR: `## PR n — <title>` then:

| # | Section | Content |
|---|---------|---------|
| 1 | **Review question** | One sentence |
| 2 | **Out of scope** | What later PRs add |
| 3 | **Surprise audit** | `None identified` or bullets + hints |
| 4 | **Risk tags + hints** | Tags; 1–2 imperative hints |
| 5 | **Files** | Paths; cross-PR hunk map inline if needed |
| 6 | **Mergeability + splittability edits** | Why safe alone; flag/dark-ship state; `none` or edits in this PR; PR # removing scaffolding |
| 7 | **Validation** | Command + `Outcome: not run — slice not materialized; run in Phase 5 after commit` |

Per-PR metadata (base, team, modules, change class) — one line under the title if needed:

`Base: upstream/main · Team: @elastic/... · Modules: @kbn/... · Class: mechanical|behavioral|mixed`

After Phase 5, append execution log (branch, SHA, outcome pass|fail) under Validation.

---

## Example PR block (cross-PR hunk map)

`## PR 3 — Dark-ship new backoff behind useNewRetry`

Base: PR2 branch · Team: @elastic/kibana-management · Modules: @kbn/task-manager · Class: behavioral

### Review question

Is the new backoff correct when enabled, and fully inactive when `useNewRetry` is false?

### Out of scope

Enabling flag (PR4); type extraction (PR1).

### Surprise audit

`task_runner.ts` also in PR2 (wiring) and PR4 (flip)—hunk map in Files.

### Risk tags + hints

`concurrency`, `tests`

- Trace `runTask()`—`useNewRetry` branch unreachable at default.
- Unit tests cover both policies without timing flakes.

### Files

- `packages/.../retry_policy.ts` — new backoff impl
- `packages/.../task_runner.ts` — **PR3 only:** `useNewRetry` branch (default false)
- Hunk map: `task_runner.ts` — PR2: wiring; PR3: `useNewRetry`; PR4: remove legacy

### Mergeability + splittability edits

Dark-ship off at default; production path unchanged. Add `const useNewRetry = false` and `NewRetryPolicy`. Scaffolding removed in PR4.

### Validation

- Command: `node scripts/check --scope branch --base-ref upstream/main`
- Outcome: not run — slice not materialized; run in Phase 5 after commit
