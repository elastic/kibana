# Flakiness Risk Patterns for Migration

## Table of Contents
- [Critical — Will cause flakiness in Scout](#critical--will-cause-flakiness-in-scout)
- [High — Likely to cause issues](#high--likely-to-cause-issues)
- [Medium — Address during rewrite](#medium--address-during-rewrite)
- [How to use this during triage](#how-to-use-this-during-triage)

Scan Cypress source code for these patterns before migration. Each indicates a risk area that needs specific handling in the Scout rewrite. Check the test file **and its imported tasks/screens/objects**.

## Critical — Will cause flakiness in Scout

### Hard-coded waits

- **Look for:** `cy.wait(number)` (e.g., `cy.wait(500)`, `cy.wait(2000)`)
- **Why:** The underlying timing issue the wait masks must be addressed. `page.waitForTimeout()` is forbidden in Scout.
- **Scout approach:** Playwright auto-waiting, `expect.poll()`, or locator assertions with built-in retry.

### Missing cleanup / shared state

- **Look for:** Tests with no `afterEach`/`after` cleanup; `esArchiverLoad` without unload; API resources created but never deleted; global mutable state.
- **Why:** Cypress runs each spec in a clean browser. Scout shares the environment across specs in a worker — leftover data causes cascading failures.
- **Scout approach:** Explicit cleanup in `afterAll`/`afterEach`, defensive cleanup in `beforeAll`, unique identifiers per worker (`scoutSpace.id`).

### Force interactions

- **Look for:** `{ force: true }` on `.click()`, `.type()`, `.check()`, `.select()`
- **Why:** Playwright strict mode rejects interactions with hidden/disabled elements. Force-clicks mask real UI issues (element behind overlay, not yet visible, disabled).
- **Scout approach:** Wait for the element to be actionable. If behind an overlay, close the overlay first.
- **Exception:** If the Cypress `{ force: true }` exists because an **app bug** causes continuous DOM re-rendering (e.g., a `useEffect` loop triggering table re-fetches), use `dispatchEvent('click')` to bypass actionability checks without triggering the `playwright/no-force-option` lint rule. Document the app bug location and consider filing a fix. See `migration-best-practices.md` → "dispatchEvent for app-level DOM instability".

### `esArchiver` for system indices

- **Look for:** `cy.task('esArchiverLoad', ...)` targeting system index names (`.kibana`, `.alerts`, `.fleet`, etc.)
- **Why:** Forbidden in Scout. System indices are managed by Kibana and must be created via APIs.
- **Scout approach:** Use `kbnClient` or `apiServices` to create saved objects and configuration.

## High — Likely to cause issues

### `cy.intercept()` + `cy.wait('@alias')` as sync points

- **Look for:** `cy.intercept('GET|POST', '/api/...').as('alias')` followed by `cy.wait('@alias')`
- **Why:** Playwright doesn't have Cypress-style request interception for synchronization. Direct ports using `page.waitForResponse()` are fragile.
- **Scout approach:** Wait for UI state instead: `expect(locator).toBeVisible()`, `expect.poll()`, or data-loading indicators.

### `recurse()` or retry loops

- **Look for:** `recurse()`, `cy.waitUntil()`, manual retry loops, `.should()` chains wrapping re-tried actions
- **Why:** Indicates unstable UI or race condition in the app. The instability carries over to Scout.
- **Scout approach:** Use `expect.poll()` or `expect(locator).toPass()`. Fix the underlying instability if it's an app bug.

### Index-based selectors

- **Look for:** `.eq(0)`, `.first()`, `.last()`, `:nth-child()` without `data-test-subj`
- **Why:** Fragile when tests run in parallel with dynamic data. Element order may differ between runs.
- **Scout approach:** Use `data-test-subj` attributes. If elements are dynamic, filter by text content or unique attributes.

### `beforeEach` with UI navigation for setup

- **Look for:** `beforeEach(() => { cy.visit(URL); ... })` with repeated page navigation or UI-driven data creation
- **Why:** Slow and flaky in Scout. Each navigation costs time and introduces timing risks.
- **Scout approach:** API-based setup in `beforeAll` (worker fixture). Navigate once, use `test.step()` for multi-step flows.

### `.within()` on re-rendering containers

- **Look for:** `.within(() => { ... })` targeting tables, lists, or containers with loading states
- **Why:** `.within()` captures a DOM snapshot that goes stale on re-render. Playwright locator chaining avoids this, but the re-rendering itself signals timing-sensitive UI.
- **Scout approach:** Use Playwright locator chaining: `page.testSubj.locator('container').locator('child')`. Locators auto-retry.

## Medium — Address during rewrite

### `cy.request()` in test body

- **Look for:** `cy.request({ method: 'POST', url: '/api/...', ... })` inside `it()` blocks (not just `before`/`beforeEach`)
- **Why:** In-test API calls should be in `apiServices`. Mixing UI and API in the test body makes tests harder to maintain and debug.
- **Scout approach:** Extract to `apiServices` or `kbnClient` calls in setup/teardown.

### `localStorage` / `sessionStorage` manipulation

- **Look for:** `cy.window().then(win => win.localStorage...)`, storage key references
- **Why:** Scout's `spaceTest` uses isolated Kibana spaces. Storage keys may differ. Async persistence can race with page reloads.
- **Scout approach:** Use API-based state management. If storage is needed, verify persistence with polling.

### `cy.task()` for server-side operations

- **Look for:** `cy.task('esArchiverLoad')`, `cy.task('createSignalsIndex')`, custom task plugins
- **Why:** No equivalent in Scout. Tasks are server-side Node.js functions.
- **Scout approach:** Replace with `kbnClient.request()`, `esClient`, or `apiServices`.

### Conditional test logic based on environment

- **Look for:** `@skipInServerless`, `@skipInEss`, `if (isServerless)`, `Cypress.env('IS_SERVERLESS')`
- **Why:** Scout handles environment targeting with tags, not runtime conditionals. Conditional logic suggests the test may not be portable as-is.
- **Scout approach:** Use Scout tags for environment filtering. Split into separate tests if behavior diverges.

### Deeply nested `.should()` chains

- **Look for:** `.should('be.visible').and('contain', 'text').and('have.attr', 'href', '/path')`
- **Why:** Multiple assertions on a single element work differently in Playwright. Each assertion needs its own `expect()`.
- **Scout approach:** Separate `expect()` calls: `await expect(locator).toBeVisible()`, `await expect(locator).toContainText('text')`.

### `cy.clock()` / `cy.tick()` for time manipulation

- **Look for:** `cy.clock()`, `cy.tick()`, fake timers
- **Why:** Playwright has its own clock API (`page.clock`) with different semantics. Direct port is error-prone.
- **Scout approach:** Use `page.clock.install()` / `page.clock.fastForward()`, or redesign to avoid fake timers.

## How to use this during triage

1. Read the Cypress test file and all imported helpers (tasks, screens, objects)
2. Check each pattern against the source code
3. Record which patterns are present and their risk level
4. For critical/high patterns: note specific lines and planned Scout remediation
5. For tests with 3+ critical/high patterns: consider writing from scratch rather than porting
6. Include the risk scan findings in the triage summary before proceeding to migration
