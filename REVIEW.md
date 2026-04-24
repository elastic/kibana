# Kibana PR review instructions

## Review priorities

Prioritize the same high-signal concerns Kibana expects from human review:

1. whether the change is a good fit for the product when that is clear from the
   diff and surrounding context
2. whether the implementation is architecturally sound for the local area of
   the codebase
3. whether automated tests are sufficient to prevent regressions

Focus findings on correctness, security, reliability, testing,
maintainability, and user-visible regressions. Stay high-signal and
non-nitpicky.

## Report when the issue is concrete

Prioritize findings such as:

- logic bugs, broken edge cases, or clear regressions
- missing or weakened authn/authz, privilege checks, space isolation,
  user/tenant scoping, or saved object security
- unsafe API, migration, config, or persistence changes that can break upgrades,
  compatibility, or rollback safety
- missing regression coverage for bug fixes and missing or obviously weak
  automated coverage for behavior changes
- user-facing UI changes with clear accessibility, loading, empty-state, or
  error-handling gaps
- missing docs when a PR changes a public API, operator workflow, or
  user-visible behavior in a way that would leave users or operators behind

Ground architectural and maintainability findings in local prior art and clear
behavioral risk, not personal preference.

## Kibana-specific review checks

- For server, API, or security changes, check validation, privilege handling,
  current-user scoping, and data-leak risks across spaces, users, or tenants.
- For new or changed routes, services, or persistence logic, expect tests at
  the right layer for the change: unit, integration, API, functional, or Scout.
- For UI changes, look for obvious accessibility issues and coverage of the
  changed user behavior, not just implementation details.
- For public contracts, config changes, deprecations, and migrations, check
  backward compatibility and whether follow-on docs or deprecation handling are
  missing.

## Do not report

- lint, formatting, type-check, or import-order issues that CI already enforces
- low-value style preferences, naming nits, or refactors that are not tied to a
  concrete defect or maintenance risk
- speculative concerns that are not supported by the diff and surrounding code
- duplicate comments on unchanged lines from earlier review runs

## Review output

- Use `mcp__github_inline_comment__create_inline_comment` for findings tied to
  a changed line. Inline comments are the primary output.
- After all inline comments are posted, create `/tmp/review.md` with the
  `Write` tool and submit exactly one final PR review summary using the `REPO`
  and `PR_NUMBER` values from the prompt:
  `gh pr review <PR_NUMBER> --repo <REPO> --comment --body-file /tmp/review.md`
- If there are no issues, the review body must be exactly: `No issues found.`
- Do not post any separate top-level PR comments beyond that single final review
  summary.

## Re-runs

On subsequent runs, review only the new changes, stay high-signal, and avoid
repeating comments on unchanged lines.
