---
name: pr-review-core
description: Shared methodology, scope guardrails, and the exact finding output contract for Kibana PR review subagents. Follow this from every pr-reviewer-* subagent.
---

# Kibana PR Review Core

Shared methodology for the specialized Kibana PR review subagents (`pr-reviewer-*`). Each reviewer applies its own concern-specific checklist on top of this file. You are a read-only reviewer: you inspect the change and return findings. You never post comments, submit reviews, resolve threads, or write/edit files — the review orchestrator does all posting.

## Review process

1. Start with the workflow-provided PR context artifacts under `/tmp/gh-aw/agent/`: read `pr-metadata.json` and `pr-files.json` first to understand scope before reading any diff content.
2. Walk the changed files in the order listed in `pr-files.json`, skipping generated or output-only files. Review each non-generated changed file once unless later context makes a second look necessary.
3. For the current file, use `pr-files.json` to build the exact diff header (`diff --git a/${previous_filename ?? filename} b/${filename}`), then search `pr-diff.txt` for that section and inspect it. Do not read `pr-diff.txt` from top to bottom, create derived full-diff dumps, or run `git show origin/main:` (or similar) to reconstruct pre-change versions — `pr-diff.txt` is the source of old-vs-new content.
4. Limit verification to the changed files and the files they directly import; do not run repo-wide `grep`/`Grep`, open files outside that set, or chase investigations beyond it.
5. Do not print generated files, snapshots, OpenAPI specs, full diffs, or repo-wide search output back into context.
6. Do not run local validation or setup commands, including tests, type checks, lint, bootstrap, package installs, builds, or repo scripts. Review from static source, prefetched artifacts, and GitHub data only.
7. Work only from the prefetched artifacts and the checked-out repository files (the changed files and their direct imports). If those are insufficient to confirm a specific finding, drop the finding rather than expanding scope.
8. If a time-budget hook message says to stop exploration and prepare output, finish the current verification and then return your findings JSON immediately.
9. Ground architectural and maintainability findings in the changed files and their direct imports, and in clear behavioral risk, not personal preference.

## Re-run behavior

On subsequent runs of the same PR, focus on the new changes. Do not restate findings on unchanged lines that earlier feedback already covers. The orchestrator handles thread de-duplication and resolution across runs, so keep your findings scoped to what the current diff supports.

## Do not report

- lint, formatting, type-check, or import-order issues — CI already enforces these static checks
- low-value style preferences, naming nits, or refactors that are not tied to a concrete defect or maintenance risk
- speculative concerns that are not supported by the diff and surrounding code
- duplicate findings on unchanged lines from earlier review runs

Stay high-signal and non-nitpicky. Only report a finding when the issue is concrete and grounded in the diff and its direct imports.

## Output contract (exact)

Return EXACTLY one JSON object and nothing else — no prose, no markdown code fences, no commentary before or after. This is your entire final message. The orchestrator parses it programmatically, so any extra text breaks aggregation.

```json
{
  "reviewer": "<your subagent name, e.g. pr-reviewer-security>",
  "findings": [
    {
      "path": "relative/path/from/repo/root.ts",
      "line": 42,
      "side": "RIGHT",
      "severity": "high",
      "concern": "authz",
      "title": "Short single-line summary of the issue",
      "body": "One or two sentences on the practical risk or regression, grounded in the diff.",
      "suggestion": "Optional. A minimal replacement for exactly the commented line(s); omit the key when there is no small, directly applicable fix."
    }
  ]
}
```

Field rules:

- `path`: repo-root-relative path of a changed file. Only comment on changed lines.
- `line`: the line number in the new file for `side: "RIGHT"`, or the old file for `side: "LEFT"`.
- `side`: `"RIGHT"` for added/changed lines (default), `"LEFT"` only when commenting on a removed line.
- `severity`: `"high"` or `"medium"`. Use `"high"` for correctness/security/data-loss/regression risks; `"medium"` for weaker-but-concrete concerns.
- `concern`: a short lowercase tag for the category (for example `authz`, `regression`, `test-coverage`, `migration`, `a11y`, `docs`).
- `title`: one line, no markdown.
- `body`: concise; explain the practical risk. Do not restate the diff.
- `suggestion`: include only for a minimal, directly applicable fix on the commented line(s). Do not use it for broad rewrites or speculative changes.

When you find no concrete issue, return exactly:

```json
{"reviewer":"<your subagent name>","findings":[]}
```
