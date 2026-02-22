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

## Playwright Best Practices (Applies to UI)

### `eslint-plugin-playwright` — Zero Suppression Policy

Kibana enforces `plugin:playwright/recommended` with strict rules for all Scout files. **Never** add `eslint-disable` for any `playwright/*` rule. Every violation has a proper fix:

| Rule | Violation | Proper Fix |
|---|---|---|
| `no-nth-methods` | `.first()`, `.nth()`, `.last()` | Make locator unique via `data-test-subj` or role-based query |
| `no-wait-for-timeout` | `page.waitForTimeout(N)` | `locator.waitFor()`, `expect(loc).toBeVisible()`, `page.waitForResponse()` |
| `max-nested-describe` | Nested `describe` (depth > 1) | `test.step()` or split into separate spec files |
| `no-conditional-expect` | `expect` in `if`/`else` | Assert deterministic state directly |
| `prefer-web-first-assertions` | `expect(await loc.isVisible()).toBe(true)` | `await expect(loc).toBeVisible()` |
| `no-wait-for-selector` | `page.waitForSelector()` | `locator.waitFor()` |
| `no-focused-test` | `test.only(...)` | Remove before committing |
| `no-page-pause` | `page.pause()` | Remove before committing |

If you find existing `eslint-disable` comments during review, flag them for removal.

### Locator Priority

Use locators in this order of preference:
1. `page.testSubj.locator('dataTestSubj')` — Kibana's stable test selector
2. `page.getByRole('button', { name: 'Submit' })` — accessible role + name
3. `page.getByLabel('Username')` — form control labels
4. `page.getByText('Welcome')` — visible text content
5. `page.getByTestId('id')` — generic data-testid

Never use CSS classes, tag names, XPath, or DOM hierarchy selectors as primary locators.
Never use `page.$()`, `page.$$()`, or `ElementHandle` — always use `Locator`.

### Web-First Assertions (auto-retry)

Always use Playwright's auto-retrying assertions:
- `await expect(locator).toBeVisible()` — NOT `expect(await locator.isVisible()).toBe(true)`
- `await expect(locator).toHaveText('...')` — NOT `expect(await locator.textContent()).toBe('...')`
- Available: `toBeVisible`, `toBeHidden`, `toBeEnabled`, `toBeDisabled`, `toHaveText`, `toContainText`, `toHaveValue`, `toHaveAttribute`, `toHaveClass`, `toHaveCount`, `toHaveURL`, `toHaveTitle`

### No Manual Waits

- Never use `page.waitForTimeout(N)` or `new Promise(r => setTimeout(r, N))`
- Wait on real conditions: `locator.waitFor()`, `expect(locator).toBeVisible()`, `page.waitForResponse()`, `expect.poll()`

### Locator Strictness

- Playwright strict mode requires locators to resolve to exactly one element
- Never use `.first()` / `.nth()` as a quick fix — make the locator more specific or add `data-test-subj` to the source component
- Chain and filter locators to narrow scope instead of global queries

### Actions Auto-Wait

- Playwright actions (`click`, `fill`, `check`, `selectOption`) auto-wait for actionability
- Don't add redundant `waitFor({ state: 'visible' })` before actions
- Only use explicit `waitFor` for disappearance checks or async-load readiness signals

### Readable Selectors

- Inline multi-step locator chains must be extracted into named constants or page object methods
- Variable names describe **what** the element is (`saveButton`, `agentSearchInput`), not how it's found
- If a locator has 2+ chained calls, it needs a descriptive name
- Reused locators belong as page object properties or methods

### Anti-Patterns to Flag

- Any `eslint-disable playwright/*` comment — must be removed and properly fixed
- `page.waitForTimeout()` or manual `setTimeout` delays
- `expect(await loc.isVisible()).toBe(true)` instead of web-first assertion
- `page.locator('.css-class')` or `#id` selectors
- `.first()` / `.nth()` / `.last()` instead of unique locators
- Nested `test.describe` deeper than 1 level
- `expect` inside conditionals
- `force: true` without a documented reason
- `networkidle` as a wait condition
- Assertions inside page objects (they belong in specs)
- `test.setTimeout(300_000)` without a comment explaining why
- Inline multi-step locator chains without a descriptive name

## Debugging Cheatsheet

- Enable Scout debug logs: `SCOUT_LOG_LEVEL=debug`.
- Prefer Playwright UI mode for local iteration: `npx playwright test --ui`.
- Use the generated Playwright HTML report to inspect failure screenshots/traces.
