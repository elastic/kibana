---
name: scout-ui-testing
description: Use when creating, updating, debugging, or reviewing Scout UI tests in Kibana (Playwright + Scout fixtures), including page objects, browser authentication, parallel UI tests (spaceTest/scoutSpace), a11y checks, and flake control.
---

# Scout UI Testing

## Pick the right test mode

- **Sequential UI**: `<module-root>/test/scout*/ui/tests/**/*.spec.ts`.
- **Parallel UI**: `<module-root>/test/scout*/ui/parallel_tests/**/*.spec.ts` and (recommended) use `spaceTest` + `scoutSpace` (one Kibana space per worker). If you run with `workers > 1` but keep using `test`, you won't get space isolation.
- Use the Scout package that matches the module root:
- `src/platform/**` or `x-pack/platform/**` -> `@kbn/scout`
- `x-pack/solutions/observability/**` -> `@kbn/scout-oblt`
- `x-pack/solutions/search/**` -> `@kbn/scout-search`
- `x-pack/solutions/security/**` -> `@kbn/scout-security`

## Imports

- Test framework + tags: `import { tags } from '@kbn/scout';` (or the module's Scout package)
- Test fixture: `import { test } from '../fixtures';` (or `import { test } from '@kbn/scout';` when not extending)
- Assertions: `import { expect } from '@kbn/scout/ui';` (or `@kbn/scout-oblt/ui`, etc.) — **not** from the main entry
- `expect` is **not** exported from the main `@kbn/scout` entry. Use the `/ui` subpath for UI tests.

## Non-negotiable conventions

- **Tags are required**: Scout validates UI test tags at runtime. Ensure each test has at least one supported tag (typically by tagging the top-level `test.describe(...)` / `spaceTest.describe(...)`, e.g. `tags.deploymentAgnostic`, `tags.stateful.classic`, or `tags.performance`).
- **No `@` in test titles**: Playwright treats `@word` in test/describe titles as tags. Do not use `@` followed by word characters in titles (e.g., `@timestamp`, `@elastic`). This causes Scout tag validation to fail with "Unsupported tag(s) found". Rephrase the title instead (e.g., use `timestamp field` instead of `@timestamp`).
- **Prefer one suite per file**: keep a single top-level `test.describe(...)` (sequential) or `spaceTest.describe(...)` (parallel) and avoid nested `describe` blocks where possible.
- **UI actions live in page objects**; assertions stay in the spec.
- **Use APIs for setup/teardown**: prefer `apiServices`/`kbnClient`/`esArchiver` in hooks over clicking through the UI.
- **Never suppress a lint rule to make it pass**: fix the code instead. A file-level `/* eslint-disable <rule> */` is never acceptable — it silences the rest of the file, including code written later. A single-line disable stating its reason is a last resort for a case the rule genuinely can't express, not a shortcut.
- **No positional selectors**: `playwright/no-nth-methods` restricts `.first()`, `.nth()`, and `.last()`. `.first()` is a symptom, not a solution: either the selector matched more than one element (scope it to a container, or add a `data-test-subj`) or the collection wasn't rendered yet (wait on a `-loading` / `-loaded` subject). Identify the element instead (`filter({ hasText })`, `getByRole('row', { name })`), or iterate with `for (const item of await items.all())` — never `while ((await items.count()) > 0)`, which races the render. Escape hatch: **Avoid selecting elements by index or position** in `docs/extend/testing/ui-best-practices.md`.

## Auth (UI)

- Use `browserAuth` — available methods: `loginAsAdmin()`, `loginAsPrivilegedUser()`, `loginAsViewer()`, `loginAs(role)`, `loginWithCustomRole(role)`.
- Prefer least privilege: use `loginAsViewer()` or `loginWithCustomRole()` over `loginAsAdmin()`.
- Avoid `loginAsAdmin()` unless the test is explicitly about admin-only behavior.

## Page objects (UI)

- Prefer `page.testSubj.locator(...)`, role/label locators; avoid brittle CSS.
- Keep selectors + interactions inside the page object class. **Do not use `expect` assertions in page objects** — use `waitForSelector` or `locator.waitFor()` for waiting on elements. Assertions belong in test specs only.
- **Attribute waits in page objects** — when a page object needs to confirm an element reached a specific attribute state (e.g. after a click toggles `aria-checked`), do **not** use `expect(el).toHaveAttribute(...)`. Instead, compose a locator with `.and()` and call `.waitFor()`:
  ```ts
  // ✅ page object — wait for attribute without asserting
  await includeEmptyRows.click();
  await includeEmptyRows
    .and(this.page.locator('[aria-checked="true"]'))
    .waitFor({ state: 'visible' });

  // ❌ page object — do not use expect
  await includeEmptyRows.click();
  await expect(includeEmptyRows).toHaveAttribute('aria-checked', 'true');
  ```
  This applies to any attribute check (`aria-pressed`, `aria-selected`, `aria-expanded`, `disabled`, etc.). The `.and()` locator composition auto-retries until the combined selector matches, equivalent to an assertion but without pulling `expect` into the page object.
- **Keep route mocks out of page objects** — page objects are for UI interactions only. Put `page.route()` mocks in a dedicated `fixtures/mocks.ts` file as standalone functions that accept `page` as a parameter. See `cloud_security_posture/test/scout_cspm_agentless/ui/fixtures/mocks.ts` for the reference pattern.
- Don't make API calls from page objects (use `apiServices`/`kbnClient` in hooks instead).
- Register plugin page objects by extending the `pageObjects` fixture in `test/scout*/ui/fixtures/index.ts`.
- **Use `readonly` class fields for static locators** — assign them in the constructor, not as getter methods. Use methods only for parameterized locators/actions. See `DashboardApp` in `kbn-scout` for the reference pattern.
- **EUI components — prefer published EUI Test Helpers over raw selectors and legacy wrappers.** Drive EUI widgets through `page.components.*` (e.g. `page.components.comboBox(testSubj)`) — Scout's factories over `@elastic/eui-test-helpers`. Don't 1:1-map an old wrapper API: use only the interactions the test needs and push data-correctness checks to API/unit tests.
- **Compatibility fallback only.** When no equivalent EUI test helper exists, fallback to using locators. Do not add or extend wrappers in a test suite. Route missing Component Object capabilities through the shared Apps DX/EUI contribution workflow.

## Parallel UI specifics (spaceTest)

- Use `spaceTest` so you can access `scoutSpace` for worker-isolated saved objects + UI settings.
- Pre-ingest shared ES data in `parallel_tests/global.setup.ts` via `globalSetupHook(...)`.
  - Only **worker** fixtures are available there (no `page`, `browserAuth`, `pageObjects`).
- Reset Elasticsearch/Kibana state once after the suite via `globalTeardownHook(...)` in `parallel_tests/global.teardown.ts` (optional, opt-in by file presence). For state that does need resetting, use `esClient`/`kbnClient`/`apiServices`. See `references/scout-ui-parallelism.md`.
- Cleanup space-scoped mutations in `afterAll` (`scoutSpace.savedObjects.cleanStandardList()`, unset UI settings you set).

## Extending fixtures

Most modules extend the base `test` (or `spaceTest`) in `test/scout*/ui/fixtures/index.ts` to add custom page objects and auth helpers:

```ts
import { test as baseTest } from '@kbn/scout'; // or the module's Scout package
import type { ScoutTestFixtures, ScoutWorkerFixtures, ScoutPage } from '@kbn/scout';

class MyPluginPage {
  constructor(private readonly page: ScoutPage) {}
  async goto() { await this.page.gotoApp('myPlugin'); }
}

interface ExtendedFixtures extends ScoutTestFixtures {
  pageObjects: ScoutTestFixtures['pageObjects'] & { myPlugin: MyPluginPage };
}

export const test = baseTest.extend<ExtendedFixtures, ScoutWorkerFixtures>({
  pageObjects: async ({ pageObjects, page }, use) => {
    await use({ ...pageObjects, myPlugin: new MyPluginPage(page) });
  },
});
```

Tests then import from local fixtures: `import { test } from '../fixtures';`

## Multi-step flows with `test.step()`

Use `test.step(...)` to group related actions within a single test. Steps appear in Playwright's trace viewer and HTML report, making failures easier to debug without splitting into many small tests:

```ts
test('creates and verifies a dashboard', async ({ pageObjects, page }) => {
  await test.step('create dashboard', async () => {
    await pageObjects.dashboard.create('My Dashboard');
  });
  await test.step('verify dashboard appears in list', async () => {
    await expect(page.testSubj.locator('dashboardTitle')).toHaveText('My Dashboard');
  });
});
```

## Waiting + flake control

- Don’t use `page.waitForTimeout`. Wait on a page-ready signal (loading indicator hidden, container visible, `expect.poll` on element counts).
- **Bind the wait to the _terminal_ signal the assertion reads**, not an earlier step. Guarding the click, dismissing one toast, or waiting on one intermediate render while the asserted element still races is the top reason a wait-based flake fix recurs.
- **Wait on the rendered outcome; if there's no element, expose one.** Prefer `expect(locator).toBeVisible()` on the element that shows the data. When nothing renders to wait on, add an app-side DOM signal (`data-test-subj` / `data-loaded` attribute) — it reflects the committed render (a response resolving ≠ the DOM updated) and doesn't couple to the endpoint. Prefer mocking/seeding when the flake is data arrival. Use `page.waitForResponse(...)` (armed *before* the action) only as a last resort for a no-UI gate (a background write or setup precondition); it's unreliable when several requests hit the same endpoint (e.g. a dashboard).
- **Poll a read, never an action:** re-query _inside_ `expect.poll`/`toPass` (a handle captured once still goes stale); never re-fire a `click`/type/`goto`/request inside the loop — that hides an actionability bug rather than fixing it.
- When an explicit wait is needed, prefer `locator.waitFor({ state: 'visible' })` over a bare `locator.waitFor()`. The two are equivalent (`visible` is the default state), but stating it keeps the intent explicit and consistent with RTL-style readiness checks.
- If selectors aren’t stable, add `data-test-subj` (Scout uses it as the `testIdAttribute`).
- Some locators are restricted by `@kbn/eslint/scout_no_locators` (e.g. `globalLoadingIndicator`). Don’t use them in tests or page objects for app loading state management; rely on Playwright auto-waiting and page-ready signals instead.

## A11y checks (optional, high value)

- Use `page.checkA11y()` at a few stable checkpoints (landing pages, modals/flyouts).
- Prefer `include` scoped checks; assert `violations` is empty.

## Run / debug quickly

- Use either `--config` or `--testFiles` (they are mutually exclusive).
- Run by config: `node scripts/scout run-tests --arch stateful --domain classic --config <module-root>/test/scout*/ui/playwright.config.ts` (or `.../ui/parallel.playwright.config.ts` for parallel UI)
- Run by file/dir (Scout derives the right `playwright.config.ts` vs `parallel.playwright.config.ts`): `node scripts/scout run-tests --arch stateful --domain classic --testFiles <module-root>/test/scout*/ui/tests/my.spec.ts`
- For faster iteration, start servers once in another terminal: `node scripts/scout start-server --arch stateful --domain classic [--serverConfigSet <configSet>]`, then run Playwright directly: `node scripts/playwright test --config <...> --project local --grep <tag> --headed`.
- `run-tests` auto-detects custom config sets from `.../test/scout_<name>/...` paths.
- `start-server` has no Playwright config to inspect, so pass `--serverConfigSet <name>` when your tests require a custom config set.
- Debug: `SCOUT_LOG_LEVEL=debug`, or `node scripts/playwright test --config <...> --project local --ui`

## CI enablement

- Scout tests run in CI only for modules listed under `plugins.enabled` / `packages.enabled` in `.buildkite/scout_ci_config.yml`.
- `node scripts/scout generate` registers the module under `enabled` so the new configs run in CI.

## References

Open only what you need:

- Rationale and worked examples behind the conventions above: `docs/extend/testing/ui-best-practices.md`
- Browser authentication helpers and patterns: `references/scout-browser-auth.md`
- Parallel UI (`spaceTest` + `scoutSpace`) isolation + global setup rules: `references/scout-ui-parallelism.md`
- API services patterns (setup/teardown helpers shared with UI): `../scout-api-testing/references/scout-api-services.md`
