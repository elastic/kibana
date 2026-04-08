---
title: Scout Test Review
model: claude-opus-4-6
reasoning: high
effort: high
input: full_diff
tools:
  - browse_code
  - git_tools
  - modify_pr
conclusion: neutral
---

Review this PR for compliance with Kibana Scout test best practices.

Only review files that are Scout test code: files under `**/test/scout*/**` paths (spec files, fixtures, page objects, API services, constants, global setup hooks). Skip all other changed files entirely.

If no Scout test files were changed in this PR, report "No Scout test files in this PR — nothing to review" and conclude with no comments.

## Best practices reference

Read `docs/extend/scout/best-practices.md` with `browse_code` and enforce all rules documented there. The sections below cover additional conventions NOT in that document.

## Imports

- For UI tests: import `expect` from `'@kbn/scout/ui'` (or the solution's Scout package `/ui` subpath like `'@kbn/scout-oblt/ui'`), never from the main `'@kbn/scout'` entry.
- For API tests: import `expect` from `'@kbn/scout/api'` (or `/api` subpath), never from the main entry.
- Use the Scout package that matches the module root:
  - `src/platform/**` or `x-pack/platform/**` → `@kbn/scout`
  - `x-pack/solutions/observability/**` → `@kbn/scout-oblt`
  - `x-pack/solutions/search/**` → `@kbn/scout-search`
  - `x-pack/solutions/security/**` → `@kbn/scout-security`

## API Auth

- Use API keys via `requestAuth` (`getApiKey`, `getApiKeyForCustomRole`) for `api/*` endpoints; use cookies via `samlAuth.asInteractiveUser(...)` for `internal/*` endpoints.
- For repeated custom roles, extract them into a `browserAuth` or `requestAuth` fixture extension instead of duplicating the role descriptor in every spec.

## API Headers & Matchers

- State-changing API requests must include the `kbn-xsrf` header.
- Prefer sending `x-elastic-internal-origin: kibana` for Kibana APIs.
- Include `elastic-api-version` for versioned public APIs (e.g., `'2023-10-31'`) or internal APIs (e.g., `'1'`).
- Use Scout custom matchers: `expect(response).toHaveStatusCode(200)`, `expect(response).toHaveStatusText(...)`, `expect(response).toHaveHeaders(...)`.

## Reuse

- Before creating new helpers, use `browse_code` to check what's already available in `@kbn/scout`, solution Scout packages (`@kbn/scout-oblt`, `@kbn/scout-search`, `@kbn/scout-security`), and plugin-local `test/scout/` directories.
- When adding helpers, place them in the correct scope: plugin-local `test/scout/` for plugin-specific, solution Scout package for cross-plugin within a solution, `@kbn/scout` for cross-solution.

## Migration Parity (when applicable)

If this PR removes or changes FTR tests alongside new Scout specs, verify migration parity:

- Confirm the right test type: if the old FTR suite is primarily "data correctness", prefer a Scout API test over a Scout UI test.
- Check that all scenarios, roles, setup/teardown, assertions, and cleanup are covered in the new Scout tests.
- Flag any coverage gaps, weakened assertions, changed auth/roles, or environment scope changes.

## Output Format

Group findings by severity: 🔴 Blocker → 🟡 Major → 🔵 Minor → ⚪ Nit. For each finding:

- State the rule violated (use the section heading from best-practices.md or from this file)
- Quote the file and line
- Explain the issue in 1–2 sentences
- Suggest a concrete fix

If all Scout best practices are followed, report "All Scout test best practices are followed — no issues found."
