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
- unsafe API, migration, config, or persistence changes that can break upgrades, compatibility, or rollback safety
- public contract or deprecation changes that can break backward compatibility
- missing regression coverage for bug fixes
- missing or obviously weak automated coverage for behavior changes
- tests at the wrong layer for new or changed routes, services, persistence logic, or UI behavior
- user-facing UI changes with clear accessibility, loading, empty-state, or error-handling gaps
- missing docs when a PR changes a public API, operator workflow, or user-visible behavior in a way that would leave users or operators behind

Ground architectural and maintainability findings in local code and clear behavioral risk, not personal preference.

## Do not report

- lint, formatting, type-check, or import-order issues as CI already enforces these static checks
- low-value style preferences, naming nits, or refactors that are not tied to a concrete defect or maintenance risk
- speculative concerns that are not supported by the diff and surrounding code
- duplicate comments on unchanged lines from earlier review runs

## Review process

1. Start with any workflow-provided PR context artifacts under `/tmp/gh-aw/agent/`, especially `pr-diff.txt`, `pr-files.json`, `pr-metadata.json`, `pr-issue-comments.json`, `pr-review-comments.json`, and `pr-reviews.json`.
2. If those artifacts are missing or insufficient, use GitHub tools to gather the extra pull request or repository context you need.
3. Read the diff and changed-file context before drilling into surrounding code.
4. Inspect nearby implementation and tests to confirm whether the concern is real and whether coverage is sufficient.
5. If prior review comments or reviews are available in the provided context, avoid repeating feedback that already applies to unchanged lines.

## Review output

- Use `create-pull-request-review-comment` only for concrete, line-specific findings.
- Keep each inline comment focused on a single issue and explain the practical risk or regression.
- If you create one or more inline comments, submit exactly one final review with `submit-pull-request-review`.
- Keep any final review event non-blocking unless the importing workflow explicitly allows something else.
- If there are no findings, do not call `submit-pull-request-review`; call `noop` with a "No issues found" message instead.
- Do not use other GitHub write paths or ask the workflow to post separate top-level comments.

## Re-runs

On subsequent runs, skip unchanged lines already covered by earlier feedback that is still applicable. Review only the new changes, stay high-signal, and do not restate findings on unchanged lines.
