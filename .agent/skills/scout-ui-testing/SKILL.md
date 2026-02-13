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
- **Prefer one suite per file**: keep a single top-level `test.describe(...)` (sequential) or `spaceTest.describe(...)` (parallel) and avoid nested `describe` blocks where possible.
- **UI actions live in page objects**; assertions stay in the spec.
- **Use APIs for setup/teardown**: prefer `apiServices`/`kbnClient`/`esArchiver` in hooks over clicking through the UI.

## Auth (UI)

- Use `browserAuth` — available methods: `loginAsAdmin()`, `loginAsPrivilegedUser()`, `loginAsViewer()`, `loginAs(role)`, `loginWithCustomRole(role)`.
- Prefer least privilege: use `loginAsViewer()` or `loginWithCustomRole()` over `loginAsAdmin()`.
- Avoid `loginAsAdmin()` unless the test is explicitly about admin-only behavior.

## Page objects (UI)

- Prefer `page.testSubj.locator(...)`, role/label locators; avoid brittle CSS.
- Keep selectors + interactions inside the page object class.
- Don't make API calls from page objects (use `apiServices`/`kbnClient` in hooks instead).
- Register plugin page objects by extending the `pageObjects` fixture in `test/scout*/ui/fixtures/index.ts`.
- Scout provides EUI component wrappers for stable interactions with common EUI widgets: `EuiComboBoxWrapper`, `EuiDataGridWrapper`, `EuiSelectableWrapper`, `EuiCheckBoxWrapper`, `EuiFieldTextWrapper`, `EuiCodeBlockWrapper`, `EuiSuperSelectWrapper`, `EuiToastWrapper`. Import them from `@kbn/scout` and use them as class members in page objects.

## Parallel UI specifics (spaceTest)

- Use `spaceTest` so you can access `scoutSpace` for worker-isolated saved objects + UI settings.
- Pre-ingest shared ES data in `parallel_tests/global.setup.ts` via `globalSetupHook(...)`.
  - Only **worker** fixtures are available there (no `page`, `browserAuth`, `pageObjects`).
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
- If selectors aren’t stable, add `data-test-subj` (Scout uses it as the `testIdAttribute`).

## A11y checks (optional, high value)

- Use `page.checkA11y()` at a few stable checkpoints (landing pages, modals/flyouts).
- Prefer `include` scoped checks; assert `violations` is empty.

## Run / debug quickly

- Use either `--config` or `--testFiles` (they are mutually exclusive).
- Run by config: `node scripts/scout.js run-tests --stateful --config <module-root>/test/scout*/ui/playwright.config.ts` (or `.../ui/parallel.playwright.config.ts` for parallel UI)
- Run by file/dir (Scout derives the right `playwright.config.ts` vs `parallel.playwright.config.ts`): `node scripts/scout.js run-tests --stateful --testFiles <module-root>/test/scout*/ui/tests/my.spec.ts`
- For faster iteration, start servers once in another terminal: `node scripts/scout.js start-server --stateful [--config-dir <configSet>]`, then run Playwright directly: `npx playwright test --config <...> --project local --grep <tag> --headed`.
- `--config-dir` notes:
- `run-tests` auto-detects the custom config dir from `.../test/scout_<name>/...` paths (override with `--config-dir <name>` if needed).
- `start-server` has no Playwright config to inspect, so pass `--config-dir <name>` when your tests require a custom server config.
- Debug: `SCOUT_LOG_LEVEL=debug`, or `npx playwright test --config <...> --project local --ui`

## References

Open only what you need:

- Browser authentication helpers and patterns: `references/scout-browser-auth.md`
- Parallel UI (`spaceTest` + `scoutSpace`) isolation + global setup rules: `references/scout-ui-parallelism.md`
- API services patterns (setup/teardown helpers shared with UI): `../scout-api-testing/references/scout-api-services.md`
