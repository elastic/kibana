# Scout Best Practices

## Decide UI vs API

- **UI tests** validate user-visible behavior and critical interactions.
- **API tests** validate response contracts and backend side effects.
- Avoid asserting detailed data correctness via the UI. Prefer an API test (and keep UI tests thin).

## File Structure (Applies to UI + API)

- Prefer one top-level `*.describe(...)` per file and keep nesting shallow. Multiple `describe` blocks are supported, but large/deep suites get hard to debug and maintain.
- Keep suites independent. Do not rely on file execution order.
- Organize by **role** and **user flow** (not by feature area alone).

## Tagging (Applies to UI + API)

- UI tests: tags are required and validated at runtime. Ensure each test has at least one supported tag (typically by tagging the top-level `test.describe(...)` / `spaceTest.describe(...)`).
- API tests: tags aren’t currently validated at runtime, but add `{ tag: ... }` to suites/tests so CI/discovery can select the right deployment target (stateful vs serverless).
- Prefer using `tags.*` constants (for example `tags.deploymentAgnostic`, `tags.stateful.classic`) to avoid typos and to align with Scout’s supported tags.

## Setup / Teardown (Applies to UI + API)

- Put cleanup in `afterEach/afterAll`, not the test body.
- Prefer API-based setup/teardown (`apiServices`/`kbnClient`/`esArchiver`) over clicking through the UI.

### Global Setup Hook

- Use `global.setup.ts` + `globalSetupHook(...)` for one-time setup shared across many files.
- Only **worker-scoped** fixtures are available in global setup (no `page`, `browserAuth`, `pageObjects`).

## Auth + Least Privilege

### UI auth

- Use `browserAuth` (no manual UI login flows).
- Prefer least privilege (`viewer`, `loginAsPrivilegedUser`, `loginWithCustomRole`).
- Avoid `admin` unless the test is explicitly about admin-only behavior.

### API auth

- `api/*` endpoints: `requestAuth` (API key) via `getApiKey()` / `getApiKeyForCustomRole()`.
- `internal/*` endpoints: `samlAuth.asInteractiveUser(...)` (cookie auth).

## UI Tests

### Page Objects

- Put selectors + UI actions in page objects; keep assertions in the spec.
- No API calls from page objects.
- Prefer extending the existing Scout/solution page objects over creating a new ad-hoc one.

### Imports

- Import `expect` from the `/ui` subpath (`@kbn/scout/ui` or `@kbn/scout-<solution>/ui`), never from the main entry.

### Locators + Selectors

- Prefer `page.testSubj.locator(...)`, role/label locators.
- Add `data-test-subj` to product code when a selector is unstable.

### Waiting + Flake Control

- Don’t use `waitForTimeout`.
- Wait on stable readiness signals: loading indicator hidden, key container visible, render-complete markers, or `expect.poll` on element counts.
- Use `test.step(...)` to make multi-step flows debuggable without splitting into many small tests.

### Skip Onboarding/Tours

- Use `page.addInitScript(...)` **before** navigation to set localStorage/cookies that suppress onboarding.

### Parallel UI (spaceTest + scoutSpace)

- Parallelism is **file-level**. Keep each file isolated.
- Use `spaceTest` so you can use `scoutSpace` (one Kibana space per worker).
- Ingest shared ES data in `parallel_tests/global.setup.ts`.
- Don’t mutate shared indices inside parallel tests.
- Clean up space-scoped changes in `afterAll` (saved objects + UI settings).

## API Tests

### Shape

1. Prepare environment with `apiServices`/`kbnClient`/`esArchiver`.
2. Generate least-privilege credentials in `beforeAll`.
3. Call the endpoint under test with `apiClient` using those credentials.
4. Assert `statusCode` and response body; verify side effects via `apiServices`/`kbnClient`.

Important: `apiServices`/`kbnClient` run with elevated privileges. Don’t use them to validate the endpoint under test or its RBAC.

### Imports

- Import `expect` from the `/api` subpath (`@kbn/scout/api` or `@kbn/scout-<solution>/api`), never from the main entry.
- Use custom matchers: `expect(response).toHaveStatusCode(200)` instead of `expect(response.statusCode).toBe(200)`.

### Assertions

- Don't stop at `statusCode`. Assert the response body shape and critical fields.

## Flakiness Workflow

- Fix the source of flakiness (selectors/readiness) instead of adding manual retry loops.
- Use the Flaky Test Runner when adding new tests or fixing flaky tests (see `dev_docs/operations/flaky_test_runner.mdx`).

## Debugging Cheatsheet

- Enable Scout debug logs: `SCOUT_LOG_LEVEL=debug`.
- Prefer Playwright UI mode for local iteration: `npx playwright test --ui`.
- Use the generated Playwright HTML report to inspect failure screenshots/traces.
