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

Reference: the canonical best-practices document lives at `docs/extend/scout/best-practices.md`. Use `browse_code` to check it when you need to verify a specific recommendation or see examples.

## Structure & Organization

- Each spec file must have exactly one top-level `test.describe(...)`, `spaceTest.describe(...)`, or `apiTest.describe(...)`. Nested `describe` blocks are not allowed; use `test.step()` for structure within a test.
- Deployment tags are required on the top-level describe block (e.g., `{ tag: tags.deploymentAgnostic }`, `{ tag: [...tags.stateful.classic] }`). UI tests enforce this at runtime; API tests rely on it for CI discovery.
- Keep spec files small: roughly 4–5 short tests or 2–3 longer ones. Oversized files become bottlenecks during parallel execution.
- Test names must be descriptive static-string sentences describing expected behavior (e.g., `'viewer can see dashboard but cannot edit'`). Generic names (`'test 1'`, `'works correctly'`) and template literals (`` `handles ${name}` ``) are not allowed.
- Prefer "one role + one flow per file" and put shared login/navigation in `beforeEach`.

## Imports

- For UI tests: import `expect` from `'@kbn/scout/ui'` (or the solution's Scout package `/ui` subpath like `'@kbn/scout-oblt/ui'`), never from the main `'@kbn/scout'` entry.
- For API tests: import `expect` from `'@kbn/scout/api'` (or `/api` subpath), never from the main entry.
- Use the Scout package that matches the module root:
  - `src/platform/**` or `x-pack/platform/**` → `@kbn/scout`
  - `x-pack/solutions/observability/**` → `@kbn/scout-oblt`
  - `x-pack/solutions/search/**` → `@kbn/scout-search`
  - `x-pack/solutions/security/**` → `@kbn/scout-security`

## Authentication & Permissions

- Never use `loginAsAdmin()` or admin-level credentials unless the test is explicitly about admin-only behavior. Prefer `loginAsViewer()`, `loginAsPrivilegedUser()`, or `loginWithCustomRole()` with minimal permissions.
- For API tests: use API keys via `requestAuth` (`getApiKey`, `getApiKeyForCustomRole`) for `api/*` endpoints; use cookies via `samlAuth.asInteractiveUser(...)` for `internal/*` endpoints.
- Test the forbidden path: verify that under-privileged roles receive `403` for endpoints they should not access.
- For repeated custom roles, extract them into a `browserAuth` or `requestAuth` fixture extension instead of duplicating the role descriptor in every spec.

## Setup & Teardown

- Always use APIs (`apiServices`, `kbnClient`, `esArchiver`) for test setup and teardown. Never create test data through the UI — it's slow and brittle.
- Cleanup must go in `afterEach` or `afterAll` hooks, never in the test body (cleanup in the test body is skipped on failure).
- Never use `try/catch` in tests or hooks for cleanup. Helpers should handle expected errors internally (e.g., an `ignoreErrors` option, or treating 404 on delete as success). Tests should be clean and declarative.
- Use `esArchiver.loadIfNeeded()` instead of `esArchiver.load()` when data may already exist (avoids redundant ingestion).
- Only load archives the tests actually use. Unused archives slow down setup and make dependencies unclear.
- Move repeated one-time setup to a global setup hook (`globalSetupHook(...)` in `global.setup.ts`) when many files share the same work.

## Waiting & Flake Prevention

- Never use `page.waitForTimeout()` or any hard sleep. This is a common source of flakiness with no readiness signal. Rely on Playwright auto-waiting and web-first assertions.
- Never use manual retry loops (e.g., `for`/`while` with `try/catch` around actions). Repeated failures point to an app issue — fix the component or stabilize the selector.
- Wait for component-specific "loaded" signals (e.g., `data-test-subj="myTable-loaded"`) rather than global indicators like the Kibana chrome spinner (unreliable for confirming a specific component finished rendering).
- Don't add redundant `waitForSelector` before actions or assertions that Playwright already auto-waits for. For example, `await page.testSubj.click('myButton')` already waits for the button to be actionable.

## Locators & Selectors

- Prefer `page.testSubj.locator(...)` and `page.testSubj.click(...)` using `data-test-subj` attributes. Never use raw CSS selectors like `page.click('[data-test-subj="myButton"]')`.
- Never select elements by positional index (e.g., `.nth(0)`) — tests may run on non-clean environments where extra data exists.
- When `data-test-subj` is missing, prefer adding one in source code. If not possible, use `getByRole` scoped inside a `data-test-subj` container.
- Some locators are restricted by `@kbn/eslint/scout_no_locators` (e.g., `globalLoadingIndicator`). Don't use restricted locators in tests or page objects.

## UI vs API Test Scope

- UI tests must focus on user interactions and rendering — does the feature work for the user? Verify that components render, respond to interaction, and navigate correctly. Don't verify computed values, exact cell contents, or aggregation results in UI tests; leave those to API or unit tests.
- API tests must validate the response body (shape and key fields), not just the status code. Status-only assertions miss contract regressions.
- Use `apiClient` for the endpoint under test (with scoped credentials). Use `apiServices`/`kbnClient` only for setup/teardown and side-effect verification. Never use elevated-privilege fixtures to validate the endpoint being tested.

## API Test Conventions

- State-changing API requests must include the `kbn-xsrf` header.
- Prefer sending `x-elastic-internal-origin: kibana` for Kibana APIs.
- Include `elastic-api-version` for versioned public APIs (e.g., `'2023-10-31'`) or internal APIs (e.g., `'1'`).
- Use Scout custom matchers: `expect(response).toHaveStatusCode(200)`, `expect(response).toHaveStatusText(...)`, `expect(response).toHaveHeaders(...)`.

## Page Objects

- Keep UI actions and selectors inside page objects; keep `expect(...)` assertions explicit in test files so reviewers can see intent and failure modes.
- Never hide assertions inside page objects.
- Never make API calls from page objects — use `apiServices`/`kbnClient` in hooks instead.
- Never use conditional logic (if/else based on `isVisible()`) in page objects to handle unknown state. Actions should be explicit about the state they expect. Playwright creates a fresh browser context for each test — there is no cached state.
- Use EUI wrappers (e.g., `EuiComboBoxWrapper`, `EuiDataGridWrapper`, `EuiSelectableWrapper`) as class fields in page objects when interacting with EUI internals.

## Parallelism & Isolation

- Prefer parallel UI test runs (`spaceTest` + `scoutSpace`) for faster execution. Sequential mode should only be used when tests require a "clean" Elasticsearch state.
- In parallel tests, use `scoutSpace` for worker-isolated saved objects and UI settings.
- Clean up space-scoped mutations in `afterAll` (e.g., `scoutSpace.savedObjects.cleanStandardList()`).
- Never rely on test file execution order — it is not guaranteed by Playwright.

## Reuse & Maintainability

- Prefer existing page objects, fixtures, and `apiServices` before creating new helpers. Use `browse_code` to check what's already available in `@kbn/scout`, solution Scout packages, and plugin-local `test/scout/` directories.
- When adding helpers, place them in the correct scope: plugin-local `test/scout/` for plugin-specific helpers, solution Scout package for cross-plugin within a solution, `@kbn/scout` for cross-solution reuse.
- Extract shared test values (archive paths, time ranges, endpoints, common headers) into a `constants.ts` file to reduce duplication and typos.

## Timeouts

- Don't override suite-level timeouts or retries with `test.describe.configure()` unless there is a strong, documented reason.
- If increasing a timeout for a single operation, keep it well below the test timeout and include a short rationale.
- Remember: time spent in hooks (`beforeEach`, `afterEach`) counts toward the test timeout.

## Assertions

- Use `expect.soft()` for multiple independent checks (KPI tiles, table columns, multiple response fields) so the test reports all failures instead of stopping at the first.
- Prefer `expect()` over manual boolean checks — Playwright's error output includes the locator, call log, and a clear message that `if`/`throw` patterns lose.

## Migration Parity (when applicable)

If this PR removes or changes FTR tests alongside new Scout specs, verify migration parity:

- Confirm the right test type: if the old FTR suite is primarily "data correctness", prefer a Scout API test over a Scout UI test.
- Check that all scenarios, roles, setup/teardown, assertions, and cleanup are covered in the new Scout tests.
- Flag any coverage gaps, weakened assertions, changed auth/roles, or environment scope changes.

## Output Format

Group findings by severity: 🔴 Blocker → 🟡 Major → 🔵 Minor → ⚪ Nit. For each finding:

- State the rule violated (use the section heading)
- Quote the file and line
- Explain the issue in 1–2 sentences
- Suggest a concrete fix

If all Scout best practices are followed, report "All Scout test best practices are followed — no issues found."
