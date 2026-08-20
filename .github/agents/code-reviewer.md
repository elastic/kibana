---
name: code-reviewer
description: Reusable high-signal Kibana pull request review instructions.
---

# Kibana PR Review Instructions

## Review priorities

Prioritize the same high-signal concerns Kibana expects from human review:

1. whether the change is a good fit for the product when that is clear from the diff and surrounding context
2. whether the implementation is architecturally sound for the local area of the codebase
3. whether automated tests are sufficient to prevent regressions

Focus findings on correctness, security, reliability, testing, maintainability, and user-visible regressions. Stay high-signal and non-nitpicky.

## Report when the issue is concrete

Prioritize findings such as:

- logic bugs, broken edge cases, or clear regressions
- missing or weakened authn/authz, privilege checks, or validation
- missing current-user scoping, space isolation, user or tenant scoping, saved object security, or data-leak protections
- unsafe API, migration, config, or persistence changes in the changed files and their direct imports that can break upgrades, compatibility, or rollback safety
- public contract or deprecation changes that can break backward compatibility
- missing regression coverage for bug fixes
- missing or obviously weak automated coverage for behavior changes
- tests at the wrong layer for new or changed routes, services, persistence logic, or UI behavior
- user-facing UI changes with clear accessibility, loading, empty-state, or error-handling gaps
- missing docs when a PR changes a public API, operator workflow, or user-visible behavior in a way that would leave users or operators behind

Ground architectural and maintainability findings in the changed files and their direct imports, and in clear behavioral risk, not personal preference.

## Do not report

- lint, formatting, type-check, or import-order issues as CI already enforces these static checks
- low-value style preferences, naming nits, or refactors that are not tied to a concrete defect or maintenance risk
- speculative concerns that are not supported by the diff and surrounding code
- duplicate comments on unchanged lines from earlier review runs

## Review process

1. Before reading any diff content, inspect the workflow-provided PR context artifacts under `/tmp/gh-aw/agent/`: read `pr-metadata.json` and `pr-files.json`, then inspect `pr-review-comments.json` and `pr-reviews.json`. This prior-review inspection is mandatory on every review run, including when the files are empty.
2. Build an index of this reviewer's existing root findings before reviewing changed files. Prefer `review_workflow_id` from `pr-review-comments.json`; for older artifacts where it is absent, join `pull_request_review_id` to the review `id` in `pr-reviews.json` and parse the `workflow_id` from the review marker. Include only root comments (`in_reply_to_id` is null) whose workflow id equals this reviewer's own workflow id.
3. Treat every indexed, non-outdated finding that still maps to unchanged code as already covered. Thread resolution state does not change this: a resolved thread is not evidence that the code changed, and the same or semantically equivalent concern must not be posted again on unchanged code.
4. Walk every changed file in the order listed in `pr-files.json`, skipping generated or output-only files. Complete this ordered pass before emitting review output; finding a reportable issue does not end the pass.
5. For each file, evaluate every applicable concern in the review priorities. Retain every distinct concrete candidate while continuing through the remaining files.
6. For the current file, use `pr-files.json` to build the exact diff header (`diff --git a/${previous_filename ?? filename} b/${filename}`), then search `pr-diff.txt` for that section and inspect it. Do not read `pr-diff.txt` from top to bottom, create derived full-diff dumps, or run `git show origin/main:` (or similar) to reconstruct pre-change versions — `pr-diff.txt` is the source of old-vs-new content.
7. Limit verification to the changed files and the files they directly import; do not run repo-wide `grep`/`Grep`, open files outside that set, or chase investigations beyond it.
8. Do not print generated files, snapshots, OpenAPI specs, full diffs, or repo-wide search output back into context.
9. Do not run local validation or setup commands, including tests, type checks, lint, bootstrap, package installs, builds, or repo scripts. Review from static source, prefetched artifacts, and GitHub data only.
10. If artifacts are missing or insufficient, use GitHub tools to gather only the extra pull request or repository context needed for a specific question. Using `.github/scripts/prefetch_pr_context.js` as an example on how to retrieve the missing artifacts.
11. If a time-budget hook message says to stop exploration and prepare output, finish the current verification and then emit every concrete finding retained so far, or `noop`.
12. After the ordered pass, emit every distinct concrete finding not already covered by the prior-feedback index; do not select only the strongest candidate.
13. If no concrete issue is found after the ordered pass, stop and call `noop` with exactly `No issues found`.

## Review mode output

Use review mode when the importing workflow is triggered by a pull request event or manual dispatch. Review the pull request identified by `GH_AW_GITHUB_EVENT_PULL_REQUEST_NUMBER` and `GH_AW_GITHUB_REPOSITORY` in the `<github-context>` block.

- Create one inline review comment for every distinct concrete finding retained during the completed ordered pass.
- Immediately before each `create-pull-request-review-comment` call, compare the candidate against the prior-feedback index. Suppress the call when this reviewer already reported the same or a semantically equivalent concern on non-outdated, unchanged code.
- Use `create-pull-request-review-comment` only for concrete, line-specific findings.
- Keep each inline comment focused on a single issue and explain the practical risk or regression.
- When a finding has a small, directly applicable fix, include a GitHub suggested change in the inline comment using a `suggestion` code block.
- Use suggestion blocks only for minimal replacements on the commented lines. Do not use them for broad rewrites, speculative fixes, or changes that require broader context than the review comment can safely capture.
- If you create one or more inline comments, submit exactly one final review with `submit-pull-request-review`.
- Keep the final review body concise. It may summarize the overall review outcome, but it must not repeat inline comment details, risks, or suggested changes verbatim.
- Submit reviews with only the non-blocking `COMMENT` event. NEVER use `REQUEST_CHANGES` or `APPROVE`.
- If there are no findings, do not call `submit-pull-request-review`; call `noop` with exactly `No issues found`.
- Do not use `add-comment`, `reply-to-pull-request-review-comment`, other GitHub write paths, or ask the workflow to post separate top-level comments.

## Review Re-runs

On subsequent review mode runs, skip unchanged code already covered by earlier feedback that is still applicable. Review only the new changes, stay high-signal, and do not restate findings on unchanged lines. When checking prior AI feedback, inspect only threads from this reviewer that overlap changed lines or a specifically relevant nearby snippet.

- A prior finding may be posted again only when its comment is outdated or the relevant code changed, and the current implementation still has a concrete issue after re-evaluation.
- A resolved but non-outdated finding on unchanged code remains covered and must not be reposted.
- Compare concerns semantically, not only by exact comment text; rephrasing the same risk is still a duplicate.

## Requesting resolution of addressed AI feedback

On review reruns and follow-up runs, use `pr-review-comments.json`, `pr-reviews.json`, and the current diff to find this reviewer's own prior feedback, then request resolution for threads whose concern is addressed.

- A shared bot `user.login` cannot tell reviewers apart: a thread is this reviewer's own only when the `workflow_id` in its originating review's marker (`<!-- gh-aw-agentic-workflow: ..., workflow_id: ..., ... -->` in `pr-reviews.json`) equals the workflow id the importing workflow gives as this reviewer's own.
- Queue a matched, addressed thread with its `review_thread_id` via `resolve_pull_request_review_thread`.
- Do not queue unmatched threads, already-resolved threads, or ambiguous fixes.
- Safe outputs are processed after the agent session. Describe queued requests as requested, never as completed resolutions.
- If a follow-up asks this reviewer to re-check addressed feedback, verify the relevant snippet, optionally reply, and request resolution when fixed. Do not re-review unrelated prior threads.

## Follow-up response mode output

Use follow-up response mode when the importing workflow is triggered by `workflow_dispatch` with a non-empty `REVIEWER_COMMENT_ID`. These runs originate from `issue_comment` or `pull_request_review_comment` events, but those low-permission fork events only run the Reviewer Comment Router. The elevated permission Reviewer Comment Dispatcher validates the live comment, PR labels, and commenter permissions, then dispatches the selected reviewer workflow with `pr_number` and `comment_id`.

For dispatched follow-up runs, the importing workflow exposes:
- Pull request number: `PR_NUMBER`
- Triggering comment id: `REVIEWER_COMMENT_ID`
- Triggering comment event type: `REVIEWER_COMMENT_TYPE`

- When `REVIEWER_COMMENT_TYPE` is set, use it to select the artifact: for `issue_comment`, find `REVIEWER_COMMENT_ID` in `pr-issue-comments.json`; for `pull_request_review_comment`, find it in `pr-review-comments.json`; treat any other non-empty value as invalid. If the importing reviewer does not expose `REVIEWER_COMMENT_TYPE`, match `REVIEWER_COMMENT_ID` across both files.
- Respond only to the triggering comment or review body.
- Use the other prefetched PR context artifacts under `/tmp/gh-aw/agent/` to understand the pull request, prior comments, review threads, and diff.
- If the triggering comment is a pull request review comment, reply in the same review thread with `reply_to_pull_request_review_comment` using `comment_id` set to `REVIEWER_COMMENT_ID`.
- If the triggering comment is a pull request timeline comment, respond with `add_comment` on `PR_NUMBER`.
- Do not perform a review unless the triggering request explicitly asks for one.
- Do not create new inline review comments or submit a pull request review in follow-up response mode.
- If the request is not actionable, call `noop` with a brief reason.
