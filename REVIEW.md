# Kibana PR review instructions

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
- missing current-user scoping, space isolation, user/tenant scoping, saved object security, or data-leak protections
- unsafe API, migration, config, or persistence changes that can break upgrades, compatibility, or rollback safety
- public contract or deprecation changes that can break backward compatibility
- missing regression coverage for bug fixes
- missing or obviously weak automated coverage for behavior changes
- tests at the wrong layer for new or changed routes, services, persistence logic, or UI behavior
- user-facing UI changes with clear accessibility, loading, empty-state, or error-handling gaps
- missing docs when a PR changes a public API, operator workflow, or user-visible behavior in a way that would leave users or operators behind

Ground architectural and maintainability findings in local code and clear behavioral risk, not personal preference.

## Do not report

- lint, formatting, type-check, or import-order issues that CI already enforces
- low-value style preferences, naming nits, or refactors that are not tied to a concrete defect or maintenance risk
- speculative concerns that are not supported by the diff and surrounding code
- duplicate comments on unchanged lines from earlier review runs

## Review output

- Per-line findings: post via `mcp__github_inline_comment__create_inline_comment` (the only allowed path for inline comments; body is sanitized for leaked tokens, `path` and `line` are validated against the diff).
- Final summary: create `/tmp/review.md` with the `Write` tool, then submit exactly one PR review summary with `gh pr review <PR_NUMBER> --repo <REPO> --comment --body-file /tmp/review.md`. `REPO` and `PR_NUMBER` come from the `/review` prompt line.
- If there are no findings, the review body must be exactly: `No issues found.`
- Do not post any other top-level PR comments.
- For research before posting, use `Read`, `Grep`, `Glob`, and `LS` to ground findings in surrounding code and related tests; use `gh pr view <PR_NUMBER> --repo <REPO>` (including `--json` for `reviews` and `comments`) and `gh pr diff <PR_NUMBER> --repo <REPO>` for PR context.

## Re-runs

On subsequent runs, before posting an inline comment, fetch prior review comments with `gh pr view <PR_NUMBER> --repo <REPO> --json reviews,comments` and skip lines already covered by an unchanged earlier comment from this reviewer.

Review only the new changes, stay high-signal, and do not re-state findings on unchanged lines.
