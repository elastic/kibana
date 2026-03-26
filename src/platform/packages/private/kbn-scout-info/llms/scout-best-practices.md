# Best practices for Scout tests

This guide covers best practices for writing Scout UI and API tests that are reliable, maintainable, and fast. Since Scout is built on Playwright, we also recommend reading the official [Playwright Best Practices](https://playwright.dev/docs/best-practices).

## Quick reference

**UI and API tests**

| Question                                 | Section                                                                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| How should I **organize** my test files? | [Organize test suites by role and user flow](#organize-test-suites-by-role-and-user-flow)                              |
| Where should **shared setup** go?        | [Move repeated one-time setup to a global setup hook](#move-repeated-one-time-setup-operations-to-a-global-setup-hook) |
| Where should **cleanup code** go?        | [Put cleanup code in hooks, not in the test body](#put-cleanup-code-in-hooks-not-in-the-test-body)                     |
| What **permissions** should my test use? | [Test with minimal permissions](#test-with-minimal-permissions-avoid-admin-when-possible)                              |
| How do I know if my test is **flaky**?   | [Use the Flaky Test Runner to catch flaky tests early](#use-the-flaky-test-runner-to-catch-flaky-tests-early)          |

**UI tests**

| Question                                                             | Section                                                                                                       |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| What should I test in **UI tests** vs **API tests**?                 | [Focus UI tests on behavior, not data correctness](#focus-ui-tests-on-behavior-not-data-correctness)          |
| Should my tests run in **parallel** or **sequentially**?             | [Run tests in parallel whenever possible](#run-tests-in-parallel-whenever-possible)                           |
| Should I split into multiple `test()` blocks or use **`test.step`**? | [Use `test.step` for multi-step flows](#use-teststep-for-multi-step-flows)                                    |
| How should I set up **test data**?                                   | [Prefer Kibana APIs over UI for setup and teardown](#prefer-kibana-apis-over-ui-for-setup-and-teardown)       |
| How do I skip **onboarding screens**?                                | [Skip onboarding flows with `addInitScript`](#skip-onboarding-flows-with-addinitscript)                       |
| Do I need to add explicit **waits** everywhere?                      | [Leverage Playwright auto-waiting](#leverage-playwright-auto-waiting)                                         |
| How do I **wait for the UI** to be ready?                            | [Wait for UI updates when the next action requires it](#wait-for-ui-updates-when-the-next-action-requires-it) |
| How do I test **tables** and **complex components**?                 | [Wait for complex components to fully render](#wait-for-complex-components-to-fully-render)                   |
| What **locators** should I use?                                      | [Locate UI elements reliably](#locate-ui-elements-reliably)                                                   |
| Should I change Scout's default **timeouts**?                        | [Use Scout's default timeouts](#use-scouts-default-timeouts)                                                  |
| How do I write good **page objects**?                                | [Page object tips](#page-object-tips)                                                                         |
| My test keeps failing — should I add **retries**?                    | [Don't use manual retry loops — fix the source code](#dont-use-manual-retry-loops--fix-the-source-code)       |
| Should I **contribute** my page object to Scout?                     | [Contribute to Scout when possible](#contribute-to-scout-when-possible)                                       |

**API tests**

| Question                        | Section                                                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Which **fixture** should I use? | [Validate endpoints with `apiClient`](#validate-endpoints-with-apiclient-for-readable-and-scoped-tests)                       |
| What should I **assert**?       | [Don't just verify the status code, validate the response body](#dont-just-verify-the-status-code-validate-the-response-body) |

---

## UI and API tests

Best practices that apply to both UI and API tests.

### Keep test suites independent

Each test file must contain **one test suite** (`test.describe`) with a **flat hierarchy** — no nested `describe` blocks. This ensures CI can skip only failing tests without affecting unrelated ones in the same file.

> **Need different setup for different tests?** Split them into separate files. Need granular reporting? Use [`test.step`](#use-teststep-for-multi-step-flows) within a test.

> **Test file execution order is [not guaranteed](https://playwright.dev/docs/test-parallel#control-test-order).** Don't rely on one file running before another. Use a global setup hook for any shared setup that all tests depend on.

### Organize test suites by role and user flow

Organize your test files by the **role** they require (e.g., `viewer`, `editor`, a custom role, etc.) and by **user flow** (e.g., `dashboard_crud.spec.ts`, `dashboard_filters.spec.ts`). This keeps tests focused and makes them easier to parallelize.

> **Why split by user flow?** When a test fails, CI will skip remaining tests in the same `describe` block. Splitting unrelated flows into separate files ensures one failure doesn't prevent unrelated tests from running.

**❌ Don't mix roles and repeat login/navigation in each test**

```ts
// mixed_tests.spec.ts - hard to parallelize, repetitive setup
test('viewer can see dashboard', async ({ browserAuth, pageObjects }) => {
  await browserAuth.loginAsViewer();
  await pageObjects.dashboard.goto();
  // ... test assertions
});

test('editor can edit dashboard', async ({ browserAuth, pageObjects }) => {
  await browserAuth.loginAsEditor();
  await pageObjects.dashboard.goto();
  // ... test assertions
});
```

Mixing roles in one file makes it harder to run tests in parallel and leads to repetitive setup code.

**✅ Do split by role and use `beforeEach` for shared setup**

```ts
// dashboard_viewer.spec.ts
test.beforeEach(async ({ browserAuth, pageObjects }) => {
  await browserAuth.loginAsViewer();
  await pageObjects.dashboard.goto();
});

test('can see dashboard', async ({ page }) => {
  // ... test assertions
});

test('cannot edit dashboard', async ({ page }) => {
  // ... test assertions
});
```

```ts
// dashboard_editor.spec.ts
test.beforeEach(async ({ browserAuth, pageObjects }) => {
  await browserAuth.loginAsEditor();
  await pageObjects.dashboard.goto();
});

test('can edit dashboard', async ({ page }) => {
  // ... test assertions
});
```

Each file focuses on a single role. Login and navigation happen once per test in `beforeEach`, making the code intuitive and parallel-ready.

### Move repeated one-time setup operations to a global setup hook

Move one-time repeated setup steps (e.g. data ingestion, API calls) across both sequential and parallel test files to a global setup hook. This is a great way to reduce test execution time and avoid redundant code.

**❌ Repeated operations across multiple test suites**

```ts
// test file 1 (beforeAll)
test.beforeAll(async ({ esArchiver }) => {
  await esArchiver.loadIfNeeded(myVerySameArchive);
});

// test file 2 (beforeAll)
test.beforeAll(async ({ esArchiver }) => {
  await esArchiver.loadIfNeeded(myVerySameArchive);
});
```

While `esArchiver.loadIfNeeded` safeguards against re-ingesting the archive, it does not eliminate the cost of the check itself. Running this operation per file results in redundant operations and slower tests. Check if there is logic that can be moved to a global setup hook instead.

**✅ Run one-time setup operations once in the global setup**

```ts
globalSetupHook('Ingest archive into Elasticsearch', async ({ esArchiver, log }) => {
  log.debug('[setup] loading archives test data (only if indexes do not exist)...');
  await esArchiver.loadIfNeeded(myVerySameArchive);
});
```

The same logic applies to **API calls**, updating **settings**, or any other one-time setup step.

### Put cleanup code in hooks, not in the test body

Cleanup code in the test body **won't run if the test fails** because the execution stops after the first failure. Always put cleanup logic in `afterEach` or `afterAll` hooks to ensure resources are cleaned up regardless of test outcome.

**❌ Don't put cleanup in the test body**

```ts
test('creates and deletes an index', async ({ esClient }) => {
  await esClient.indices.create({ index: testIndexName });

  // ... test assertions ...

  await esClient.indices.delete({ index: testIndexName });
});
```

If the test fails, the cleanup never runs — leaving stale data (like the test index) behind. This can cause **cascading failures** in subsequent tests that expect a clean state, or fail on the next run when the resource already exists.

**✅ Do put cleanup in `afterEach` or `afterAll` hooks**

```ts
test.afterEach(async ({ esClient, log }) => {
  try {
    await esClient.indices.delete({ index: testIndexName });
  } catch (e: any) {
    log.debug(`Index cleanup failed: ${e.message}`);
  }
});

test('creates an index', async ({ esClient }) => {
  await esClient.indices.create({ index: testIndexName });
  // ... test assertions ...
  // cleanup runs automatically after test, even if it fails
});
```

### Test with minimal permissions (avoid `admin` when possible)

Generally, **avoid** using `admin` privileges unless absolutely necessary as that can mask permission-related bugs and lead to less realistic test scenarios.

**❌ Don't use admin unless absolutely necessary**

```ts
// while convenient, it doesn't help us catch permission bugs
await browserAuth.loginAsAdmin();
```

Logging in with admin privileges masks **permission bugs** and makes tests less realistic. Both UI and API tests should use minimal permissions.

**✅ Do use minimal permissions**

You can either use a **built-in role** with lower permissions, such as:

```ts
// built-in role
await browserAuth.loginAsViewer();
```

...or create a role with **custom fine-grained** Kibana and Elasticsearch privileges:

```ts
// role with custom privileges
await browserAuth.loginWithCustomRole('logs_analyst', {
  elasticsearch: {
    indices: [{ names: ['logs-*'], privileges: ['read'] }],
  },
  kibana: [{ spaces: ['*'], base: [], feature: { discover: ['read'] } }],
});
```

**Note**: `browserAuth` is a core Scout fixture. See [browser authentication](scout-browser-auth.md) for more details.

### Use the Flaky Test Runner to catch flaky tests early

We recommend manually invoking the Flaky Test Runner when adding **new tests**, fixing **flaky tests**, or making **significant changes** to existing tests. It helps identify and mitigate flakiness by running tests multiple times (we recommend between **20 and 50 test runs**).

To **trigger the Flaky Test Runner**, either navigate to the [dedicated page](https://ci-stats.kibana.dev/trigger_flaky_test_runner) or post a comment on your PR:

```bash
# comment format:
/flaky scoutConfig:<Playwright config path>:<number of runs>

# sample invocation (20 runs):
/flaky scoutConfig:x-pack/platform/plugins/private/transform/test/scout/api/playwright.config.ts:20
```

### Design tests with a cloud-first mindset

Scout is designed to be **deployment-agnostic**. Write your Scout test and Playwright config **once**, and run it everywhere: locally and on Elastic Cloud. Use tags to specify which deployment types your test supports (e.g., `@local-stateful-classic`, `@local-serverless-observability_complete`, `@cloud-serverless-security_essentials`).

> **Cloud-first principle:** Scout tests should run as-is against a freshly created Elastic Cloud deployment — no extra configuration or setup required. If your test needs special deployment settings, consider an alternative approach.

---

## UI tests

Best practices specific to UI tests.

### Run tests in parallel whenever possible

Whenever possible, default to running tests in parallel. This leads to **faster test execution** and best simulates real-world usage where multiple users interact with the application simultaneously. Parallel workers **share the same ES and Kibana instance** but each operates in its own **Kibana Space** for isolation.

| Run in **parallel**                                                           | Run **sequentially**                          |
| ----------------------------------------------------------------------------- | --------------------------------------------- |
| UI tests (most test suites)                                                   | API tests                                     |
| Tests that can share pre-ingested ES data (usually via the global setup hook) | Tests requiring a "clean" Elasticsearch state |

> **Why sequential for clean state?** The global setup hook ingests data _before_ parallel workers start. Tests verifying "no data" UI states must run in a sequential test suite with no pre-ingested data.

### Use `test.step` for multi-step flows

Instead of splitting sequential operations into multiple `test()` blocks, group them in a single `test()` using `test.step()`. This **reuses the browser context** (faster) and provides **better reporting** (steps appear as collapsible sections in the HTML report).

**❌ Don't split dependent operations into separate `test()` blocks**

```ts
test('navigates to Dashboards', async ({ page, pageObjects }) => {
  await pageObjects.navigation.clickDashboards();
  expect(page.url()).toContain('/dashboards');
});

// starts from scratch — new browser context, runs beforeEach again
test('navigates to Overview', async ({ page, pageObjects }) => {
  await pageObjects.navigation.clickOverview();
  expect(page.url()).toContain('/overview');
});
```

**✅ Do use `test.step()` for sequential operations**

```ts
test('navigates through pages', async ({ page, pageObjects }) => {
  await test.step('go to Dashboards', async () => {
    await pageObjects.navigation.clickDashboards();
    expect(page.url()).toContain('/dashboards');
  });

  await test.step('go to Overview', async () => {
    await pageObjects.navigation.clickOverview();
    expect(page.url()).toContain('/overview');
  });
});
```

### Focus UI tests on behavior, not data correctness

UI tests should verify that the **UI renders correctly** — not that the data inside is correct. When UI tests validate specific data values or complex conditional logic, they become expensive to run and hard to debug when they fail.

> **Use the right test type for the job:**
>
> - **UI tests** (Scout): layout, visibility, navigation, user interactions
> - **API tests** (Scout): data correctness, business logic, response values
> - **Unit tests** (RTL/Jest): conditional rendering, component state, edge cases

**❌ Don't overload UI tests with business logic validation**

```ts
// complex table parsing to validate data from API response
const cols = await pageObjects.datasetQuality.parseDatasetTable();
const lastActivityCol = cols['Last Activity'];
const activityCells = await lastActivityCol.getCellTexts();

// validating specific text content of every cell — business logic
expect(activityCells[activityCells.length - 1]).not.toEqual('No activity');
expect(activityCells.slice(0, -1)).toEqual(['No activity', 'No activity', 'No activity']);
```

When this fails, is it the API, the UI, or the test expectation? Complex parsing logic is slow, hard to maintain, and obscures the root cause.

**✅ Do verify UI structure with simple render checks**

```ts
// confirm the column exists and is visible
await expect(page.testSubj.locator('datasetQualityTable-loaded')).toBeVisible();
await expect(page.testSubj.locator('datasetQualityTable').locator('th')).toContainText([
  'Dataset',
  'Last Activity',
]);

// basic render check — at least one cell rendered
const activityCells = page.testSubj.locator('lastActivityColumn').locator('td');
await expect(activityCells.first()).toBeVisible();
```

Validate the actual data values with Scout API tests, and test conditional rendering (e.g., "show 'No activity' when X is null") with RTL/Jest unit tests.

### Prefer Kibana APIs over UI for setup and teardown

For setup and teardown operations, **use Kibana APIs instead of UI interactions**. UI-based setup is slow, fragile, and introduces unnecessary points of failure. If the UI layout changes, your setup code breaks — even if the feature you're actually testing is fine.

> **Only test through the UI what you actually intend to cover.** Preconditions and cleanup should use APIs.

**❌ Don't use the UI for setup operations**

```ts
test.beforeEach(async ({ pageObjects }) => {
  // slow and fragile — navigates through settings pages just to set a precondition
  await pageObjects.timePicker.setDefaultAbsoluteRange({
    from: startTime,
    to: endTime,
  });
});
```

**✅ Do use Kibana APIs for reliable setup and teardown**

```ts
// set time range via UI Settings API
test.beforeEach(async ({ uiSettings }) => {
  // using UI Settings API here
  await uiSettings.setDefaultTime({ from: startTime, to: endTime });
});

// create data view via API, not UI navigation
test.beforeEach(async ({ kbnClient }) => {
  // alternative: use data view API helper (when available)
  await kbnClient.importExport.load(DATA_VIEW_ARCHIVE_PATH);
});
```

API calls are faster, more reliable, and won't break when the UI changes.

### Skip onboarding flows with `addInitScript`

Some pages show "getting started" or onboarding screens for first-time users. Instead of hacky workarounds (like navigating twice), use `page.addInitScript()` to set localStorage **before** the page loads.

**❌ Don't use navigation workarounds to skip onboarding**

```ts
async skipGettingStarted() {
  // hacky: navigating twice to bypass onboarding
  await this.page.gotoApp('elasticsearch/home');
  await this.page.testSubj.waitForSelector('skipAndGoHomeBtn');
  await this.page.gotoApp('elasticsearch/home');
}
```

**✅ Do use `addInitScript` to set localStorage before navigation**

```ts
test.beforeEach(async ({ page, browserAuth, pageObjects }) => {
  await browserAuth.loginAsViewer();
  await page.addInitScript(() => {
    window.localStorage.setItem('gettingStartedVisited', 'true');
  });
  await pageObjects.homepage.goto();
});
```

The script runs before the page loads, so the onboarding flow is skipped cleanly.

### Leverage Playwright auto-waiting

Playwright **actions** (like `click()`, `fill()`, `type()`) automatically wait for elements to be attached, visible, stable, enabled, and not covered before performing the action. This means you do **not** explicitly have to perform these checks yourself. See [Playwright auto-waiting docs](https://playwright.dev/docs/actionability).

**❌ Don't use explicit waits when possible**

```ts
// redundant because click() already waits for actionability
await page.testSubj.waitForSelector('myButton');
await page.testSubj.click('myButton');

// also redundant because fill() already waits for actionability
const input = page.locator('input[id="name"]');
await input.waitFor({ state: 'visible' });
await input.fill(name);
```

This is redundant because methods like `click()` and `fill()` already wait for elements to be actionable (attached, visible, stable, enabled, and not covered).

**✅ Do let Playwright's action auto-waiting do its magic**

```ts
// click() auto-waits for the element to be visible, enabled, stable, and ready to receive events
await page.testSubj.click('myButton');

// fill() auto-waits for the element to be visible, enabled, and editable
await page.locator('input[id="name"]').fill(name);
```

Additionally, **assertions** (like `toBeVisible()`, `toBeDisabled()`) use [auto-retrying](https://playwright.dev/docs/test-assertions#auto-retrying-assertions), meaning they continuously check the assertion condition until it passes or times out.

**❌ Don't manually wait when using a locator assertion that auto-retries**

```ts
await this.button.waitFor({ state: 'attached' });
await expect(this.button).toBeDisabled();
```

The `waitFor()` call is redundant because the `toBeDisabled()` assertion already auto-retries, waiting for the element to exist in the DOM (be _attached_) and checking if it's disabled until the condition passes or times out.

**✅ Do let auto-retrying assertions do their magic**

```ts
await expect(this.button).toBeDisabled();
```

> **Rule of thumb:** only use `waitFor()` if the element might actually be in a different state (e.g., hidden or detached). If the element is always visible, skip the wait — it's unnecessary overhead.

### Don't use manual retry loops — fix the source code

If an action fails, **don't wrap it in a retry loop**. Playwright already handles standard checks (is the element attached? visible? enabled?). A failing action usually indicates a bug in the application, not a test problem.

**❌ Don't retry failing actions**

```ts
// anti-pattern: retrying an action that keeps failing
async clickWithRetry(locator: Locator, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await locator.click();
      return;
    } catch (e) {
      if (i === retries - 1) throw e;
    }
  }
}
```

If actions like `click()`, `fill()`, or `type()` fail repeatedly, the component likely has a bug — re-rendering unexpectedly, losing DOM state, or having a non-unique ID. Retrying masks the real issue.

**✅ Do investigate and fix the application code**

Flakiness often masks a real user-facing bug. For example:

- An input field that resets while the user is typing
- A button that briefly disappears during re-renders
- Layout shifts caused by unstable state (e.g., `Math.random()` in render)

```ts
// ❌ Unstable — changes every render, causes layout shifts
const previewData = getPreviewData(item);

// ✅ Stable — memoized, prevents flaky clicks
const previewData = useMemo(() => getPreviewData(item), [item]);
```

Fix the component's rendering logic rather than forcing the test to retry.

### Locate UI elements reliably

Playwright [locators](https://playwright.dev/docs/locators) are the primary way to find elements on a page. Scout extends Playwright's `page` object with a `testSubj` helper that simplifies working with `data-test-subj` attributes.

**✅ Use `page.testSubj` for cleaner, more powerful selectors**

Scout's `page.testSubj` wrapper automatically handles `data-test-subj` selector syntax:

```ts
// Without testSubj — verbose, error-prone
await page.click('[data-test-subj="myButton"]');
await page.locator('[data-test-subj="foo"][data-test-subj="bar"]').click();

// With testSubj — clean, readable
await page.testSubj.click('myButton');
await page.testSubj.click('foo & bar'); // combines multiple test subjects
```

**Benefits:**

- **Cleaner syntax:** No need to write `[data-test-subj="..."]` manually
- **Combine selectors:** Use `&` to match multiple test subjects (e.g., `'foo & bar'`)
- **Custom helpers:** Built-in methods like `typeWithDelay()`, `clearInput()`, `dragTo()`
- **All Playwright methods:** Supports `click()`, `fill()`, `locator()`, `waitForSelector()`, and more

`data-test-subj` attributes are stable, unique constants that don't change with translations or copy updates. Always prefer them when available.

**⚠️ Locators are lazy: they do nothing until used in an action or assertion**

```ts
// this does nothing: the locator is created but never used
this.page.testSubj.locator('indexRow');

// this actually uses the locator
await expect(this.page.testSubj.locator('indexRow')).toBeVisible();
```

A standalone locator statement is a no-op. Locators don't query the DOM until used in an action (e.g., `click()`) or assertion (e.g., `toBeVisible()`).

> **Missing `data-test-subj`?** Add one to the source code rather than using workarounds like `getByText`, `getByRole`, `.first()`, `.nth()`, or `.last()`. Explicit test subjects accessed via `page.testSubj` are stable and outlast UI refactors.

**⚠️ Use `getByRole` only as a last resort, within a scoped container**

If `data-test-subj` truly isn't available and you can't add one, use `getByRole` — but **only within a specific container**:

```ts
// acceptable: scoped to a specific modal
await this.getModal().getByRole('button', { name: 'Delete' }).click();

// fragile: searching the whole page may return multiple matches
await this.page.getByRole('button', { name: 'Delete' }).click();

// better: add data-test-subj to the source code
await this.getModal().testSubj.click('confirmDeleteButton');
```

`getByRole` relies on accessible names (like button text), so tests break when text changes. `page.testSubj` with `data-test-subj` is much more stable.

**❌ Avoid `getByText` entirely**

```ts
// don't use - fragile, can match multiple elements, breaks with translations
const button = this.page.getByText('Create configuration');
await button.click();

// better: add data-test-subj and use page.testSubj
await page.testSubj.click('createConfigurationButton');
```

`getByText` searches for visible text which can match unintended elements, return multiple results, and break with translations.

**❌ Don't chain locators to drill into EUI components**

```ts
// fragile - relies on EUI internal structure
await this.page.testSubj.locator('indexPatternsField').locator('input').fill('test-index-pattern');
```

Chaining locators to find nested elements inside EUI components is fragile. Use [EUI wrappers](#use-eui-wrappers-as-class-fields-in-page-objects) instead.

**✅ Do use EUI wrappers as class fields in page objects**

```ts
// page object
import { EuiFieldTextWrapper, ScoutPage } from '@kbn/scout';

export class IndexPatternsPage {
  public readonly indexPatternField: EuiFieldTextWrapper;

  constructor(private readonly page: ScoutPage) {
    this.indexPatternField = new EuiFieldTextWrapper(page, { dataTestSubj: 'indexPatternsField' });
  }

  async fillIndexPattern(value: string) {
    await this.indexPatternField.fill(value);
  }
}
```

```ts
// test
await pageObjects.indexPatterns.fillIndexPattern('test-index-pattern');
```

EUI wrappers abstract away the internal structure and can be updated globally when EUI changes.

### Use Scout's default timeouts

Scout configures Playwright to specific timeouts (defined [here](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-scout/src/playwright/config/create_config.ts)). We recommend using these defaults unless you have a very **specific** reason to change them (and can add a **comment** explaining why). In 99% of cases, you should not need to change the defaults.

**❌ Don't use `test.describe.configure()` to override timeouts or retries**

```ts
test.describe.configure({
  timeout: 120_000,
  retries: 2,
});
```

Scout handles retries at the Buildkite job level (not via Playwright) to ensure consistent HTML failure reports and unified test result ingestion.

**❌ Don't set timeouts that exceed the test timeout**

```ts
// this will never complete - test times out at 60s
await expect(this.panel).toBeVisible({ timeout: 120_000 });
```

If an element truly takes 2 minutes to appear, the test will timeout at 60 seconds anyway. Investigate why the operation is slow instead of increasing the timeout.

**❌ Don't specify the default timeout explicitly**

```ts
// redundant because 10 seconds is already the default
await expect(editor).toBeVisible({ timeout: 10_000 });
```

**✅ Do use the defaults, and only increase timeouts when justified**

```ts
// uses default 10s timeout - no need to specify
await expect(editor).toBeVisible();

// justified because the report generation is genuinely slow
await expect(downloadBtn).toBeEnabled({ timeout: 30_000 });
```

If you need a longer timeout, keep it **well under 60 seconds** and **add a comment** explaining why.

> **Local vs CI performance:** your machine may be faster or slower than CI depending on specs. Don't tune timeouts locally. Instead, use the [Flaky Test Runner](#use-the-flaky-test-runner-to-catch-flaky-tests-early) to validate under realistic CI conditions.

### Wait for UI updates when the next action requires it

Never assume the UI is ready immediately after an action. When an action triggers a UI change that the **next action depends on**, wait for a **specific** element that confirms the UI is **ready** before proceeding.

> **Don't add waits by default.** Playwright actions auto-wait for the element they interact with. Only add explicit waits when the **next action's stability** requires it (e.g., waiting for a panel to appear before clicking something inside it). Unnecessary waits increase execution time without benefit.

**❌ Don't rely on the loading indicator to ensure page readiness**

```ts
// perform action
await this.page.testSubj.click('newItemButton');

// deprecated, not reliable, flaky
this.page.waitForLoadingIndicatorHidden();
```

Relying on the loading indicator can lead to **flakiness**, as it may disappear before the page or panel is fully ready for interaction.

**✅ Do wait for a specific element that indicates the page is ready**

Reduce flakiness when navigating to a new page:

```ts
// go to a new page
await this.page.gotoApp('sample/page/here');

// ensure the main content is visible
await this.page.testSubj.waitForSelector('mainContent', { state: 'visible' });
```

Reduce flakiness when performing an action that opens a new panel/modal:

```ts
// perform action
await this.page.testSubj.click('newItemButton');

// ensure the empty dashboard widget is visible
await this.page.testSubj.waitForSelector('emptyDashboardWidget', { state: 'visible' });
```

Reduce flakiness when interacting with dropdowns or menus:

```ts
// click to open dropdown
await this.page.testSubj.click('indexModeField');

// click() auto-waits for the option to appear and be clickable
await this.page.testSubj.click('indexModeStandardOption');

// verify the selection was applied before proceeding
await expect(this.page.testSubj.locator('indexModeField')).toHaveText('Standard');
```

Reduce flakiness when interacting with elements inside a modal that's still animating:

```ts
// wait for modal to be fully visible before interacting with elements inside
await this.page.testSubj.waitForSelector('confirmModal', { state: 'visible' });

// click() auto-waits for the button to be enabled, but you can assert if needed
await this.page.testSubj.click('confirmModalButton');
```

Reduce flakiness by waiting for modals to **close** after an action:

```ts
// click save and wait for modal to disappear before next step
await this.page.testSubj.click('saveButton');
await this.page.testSubj.waitForSelector('saveModal', { state: 'hidden' });

// now safe to proceed
await this.page.testSubj.click('nextStepButton');
```

### Wait for complex components to fully render

Some components like **tables**, **maps**, and **visualizations** require extra care. They may appear in the DOM before their data is fully loaded. Use a **two-step waiting pattern**: wait for the container, then wait for the render-complete state.

**❌ Don't rely on loading spinners to determine readiness**

```ts
// fragile — spinner disappearing doesn't mean data is rendered
await page.waitForSelector('.euiLoadingSpinner', { state: 'hidden' });
await expect(page.locator('tbody tr')).toHaveCount(7); // may fail
```

A spinner disappearing does **not** guarantee the data is fully rendered in the DOM. No testing tool can magically predict when a custom component is "ready" — the component must **expose its state** for tests to reliably wait on it.

**✅ Do expose and wait for loading state**

**In source code** — use a dynamic `data-test-subj` that reflects the component's state:

```tsx
<EuiBasicTable
  data-test-subj={`myTable-${isLoading ? 'loading' : 'loaded'}`}
  loading={isLoading}
  items={items}
  columns={columns}
  // ...
/>
```

**In tests** — wait for the `-loaded` suffix:

```ts
// page object — expose the locator
public readonly tableLoaded = this.page.testSubj.locator('myTable-loaded');

// test — use web-first assertion
await expect(pageObjects.myPage.tableLoaded).toBeVisible();
```

This pattern works for any component — tables, combo boxes, maps, panels, etc.

**✅ For maps, wait for the render-complete attribute**

```ts
async waitForMapRenderComplete() {
  await this.page.locator('div#maps-plugin').waitFor({ state: 'visible' });
  await this.page.locator('div[data-dom-id][data-render-complete="true"]').waitFor();
}
```

> **Tables are notoriously slow and flaky.** If the table you're testing doesn't expose a loading state, consider adding a dynamic `data-test-subj` to the source code.

**❌ Avoid fragile table locators**

```ts
// fragile — relies on DOM structure that can change
const serviceRows = page.locator('tbody tr');
await expect(serviceRows).toHaveCount(6);
```

Using `tbody tr` without waiting for the table to finish loading is fragile. Exact row counts are also brittle — they break when test fixtures change. Instead, expose a `data-test-subj` with loaded/loading state (e.g., `servicesTable-loaded`).

**❌ Avoid generic render waiters for specific components**

```ts
// too generic — may not wait for your specific component
await pageObjects.renderable.waitForRender();
```

Generic waiters like `renderable.waitForRender()` are useful for dashboards with multiple panels, but for a specific component (like a single map or table), a targeted waiter is more reliable.

### Page object tips

#### Use existing page objects to interact with the Kibana UI

Use page objects to interact with the Kibana UI. Use [EUI wrappers](#use-eui-wrappers-as-class-fields-in-page-objects) when you need a one-off interaction with a specific EUI component and no page object already covers it.

**❌ Don't interact with EUI components manually**

```ts
// fragile — relies on internal EUI structure
await page.testSubj.click('superDatePickerToggleQuickMenuButton');
await page.testSubj.click('superDatePickerstartDatePopoverButton');
await page.testSubj.click('superDatePickerAbsoluteTab');
await page.testSubj.fill('superDatePickerAbsoluteDateInput', '2021-10-09T23:55:00.000Z');
// ...
```

Even with `page.testSubj`, manually clicking through EUI component internals is fragile and verbose. These internal test subjects can change when EUI updates.

**✅ Do leverage existing page objects to interact with the Kibana UI**

```ts
await pageObjects.datePicker.setAbsoluteRange({
  from: 'Sep 19, 2015 @ 06:31:44.000',
  to: 'Sep 23, 2015 @ 18:31:44.000',
});
```

This production-ready page object is available in the `@kbn/scout` package.

Another example:

**❌ Don't interact with EUI components manually**

```ts
await page.testSubj.click('toastCloseButton');
```

**✅ Do use existing page objects to interact with EUI components**

```ts
await pageObjects.toasts.closeAll();
```

Let Scout abstract away the complexity of interacting with EUI components.

**✅ Do use existing page object methods when available**

```ts
// example: reusable page-specific method in Discover page object
await pageObjects.discover.waitUntilSearchingHasFinished();
```

If a useful method doesn't exist, consider contributing it to the `@kbn/scout` package (or your solution-specific Scout package).

#### Abstract common operations in page object methods

Create reusable methods for common actions:

**✅ Do create methods for reusable actions**

```ts
async openNewDashboard() {
  await this.page.testSubj.click('newItemButton');
  await this.page.testSubj.waitForSelector('emptyDashboardWidget', { state: 'visible' });
}
```

**✅ Do ensure navigation methods wait for page readiness**

```ts
async goToTimelines() {
  await this.page.gotoApp('security/timelines');
  await this.page.testSubj.waitForSelector('timelinesPage', { state: 'visible' });
}
```

Navigation methods that only call `gotoApp()` without waiting can cause flakiness — the next action may run before the page is ready.

> **Use descriptive names** for methods and locator fields that reflect what they represent (e.g., `editorOutputPane`, `goToTimelines`, `waitForEditorToLoad`).

#### Keep assertions explicit in tests, not hidden in page objects

Use explicit `expect()` assertions in your test files rather than hiding them inside page object methods. This makes test flows easier to understand during code review.

**❌ Don't hide assertions inside page object methods**

```ts
// page object method
async expectIndexToExist(indexName: string) {
  await expect(this.page.testSubj.locator('indicesTable')).toContainText(indexName);
}

// test - assertion is hidden, harder to review
await pageObjects.indexManagement.clickCreateIndexSaveButton();
await pageObjects.indexManagement.expectIndexToExist(testIndexName);
```

**✅ Do use explicit assertions in tests**

```ts
// test - assertion is visible, easy to review
await pageObjects.indexManagement.clickCreateIndexSaveButton();
await expect(page.testSubj.locator('indicesTable')).toBeVisible();
await expect(page.testSubj.locator('indicesTable')).toContainText(testIndexName);
```

Or expose locators from page objects:

```ts
// page object exposes the element
public readonly table = this.page.testSubj.locator('indicesTable');
public readonly viewRequestBtn = this.page.testSubj.locator('btnViewRequest');

// test uses explicit assertion on exposed element
await expect(pageObjects.indexManagement.table).toBeVisible();

// test can also call actions directly on exposed locators
await pageObjects.painlessLab.viewRequestBtn.click();
await expect(pageObjects.painlessLab.requestFlyoutHeader).toBeVisible();
```

Don't wrap single actions in helper methods — exposing the locator is more flexible.

**❌ Don't return booleans from page object visibility methods**

```ts
// page object - avoid this pattern
async isIndexVisible(indexName: string): Promise<boolean> {
  const indexRow = this.page.testSubj.locator(`indexTableRow-${indexName}`);
  await indexRow.waitFor({ state: 'visible', timeout: 30_000 });
  return indexRow.isVisible();
}
```

This hides the wait logic and returns a boolean that still needs to be asserted. Instead, expose the locator and let tests use web-first assertions.

**✅ Do expose locators and use web-first assertions**

```ts
// page object exposes the locator
getIndexRow(indexName: string) {
  return this.page.testSubj.locator(`indexTableRow-${indexName}`);
}

// test uses web-first assertion
await expect(pageObjects.indexManagement.getIndexRow(indexName)).toBeVisible();
```

[Web-first assertions](https://playwright.dev/docs/best-practices#use-web-first-assertions) auto-retry until the condition is met or timeout is reached — no manual `waitFor()` needed.

#### Use EUI wrappers as class fields in page objects

EUI wrappers abstract away the complexity of interacting with EUI components. Use them as **class fields** inside your page objects, then expose methods that use them.

**❌ Don't manually interact with EUI components**

```ts
// fragile — relies on EUI internal structure
await page.testSubj.click('environmentFilter > comboBoxSearchInput');
await page.testSubj
  .click('comboBoxOptionsList environmentFilter-optionsList')
  .locator('button:has-text("production")')
  .click();
await expect(page.testSubj.locator('comboBoxSearchInput')).toHaveValue('production');
```

Drilling into EUI component internals is fragile—internal test subjects and structure can change when EUI updates.

**✅ Do use EUI wrappers as class fields in your page objects**

```ts
// page object (e.g., streams_app.ts)
import { EuiComboBoxWrapper, ScoutPage } from '@kbn/scout';

export class StreamsAppPage {
  public readonly fieldComboBox: EuiComboBoxWrapper;

  constructor(private readonly page: ScoutPage) {
    // lazy loaded - Playwright won't locate it until used
    this.fieldComboBox = new EuiComboBoxWrapper(this.page, 'fieldSelectorComboBox');
  }

  async selectField(value: string) {
    await this.fieldComboBox.selectSingleOption(value);
  }
}
```

```ts
// test file
test('selects the message field', async ({ pageObjects }) => {
  await pageObjects.streamsApp.selectField('message');
  // ...
});
```

The test reads cleanly and the EUI interaction details are encapsulated in the page object.

---

## API tests

Best practices specific to API tests.

### Validate endpoints with `apiClient` for readable and scoped tests

Use the right fixture for the right purpose:

| Fixture                       | Use for                                                                                                                                                                                                                                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apiClient`                   | Testing the endpoint under test (with scoped credentials)                                                                                                                                                                                                                                           |
| `apiServices`                 | Setup, teardown, verifying side effects                                                                                                                                                                                                                                                             |
| `kbnClient`, `esClient`, etc. | Lower-level setup when `apiServices` doesn't have a suitable helper. <br/><br/>Use one of the existing fixtures (e.g., `kbnClient`, `esClient`, etc.) directly or [contribute a new API helper](#contribute-to-scout-when-possible) (recommended if you think it will be useful for other plugins). |

> See [API services](scout-api-services.md) for more details on API helpers.

**❌ Don't use `apiServices` for the endpoint under test**

```ts
apiTest('should return data', async ({ apiServices }) => {
  const response = await apiServices.myFeature.getData();
  expect(response).toBeDefined();
});
```

This hides which endpoint is tested, making the test hard to read and review. It also bypasses permission checks (superuser-like privileges are used).

**✅ Do use `apiClient` with scoped credentials for endpoint validation**

```ts
apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
  // setup with apiServices (superuser)
  await apiServices.myFeature.createTestData();

  // get credentials for the actual test
  viewerCredentials = await requestAuth.getApiKey('viewer');
});

apiTest('should return data', async ({ apiClient }) => {
  // test with realistic (viewer) credentials
  const { body, statusCode } = await apiClient.get('api/my-feature/data', {
    headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
  });

  expect(statusCode).toBe(200);
  expect(body.items).toHaveLength(3);
  // more assertions...
});
```

This pattern ensures your test validates both the endpoint behavior **and** the [permission model](#test-with-minimal-permissions-avoid-admin-when-possible).

### Don't just verify the status code, validate the response body

API tests should assert both the status code and the response body.

**❌ Don't rely only on status code**

```ts
apiTest('should return data', async ({ apiClient }) => {
  const { statusCode } = await apiClient.get('api/console/api_server', {
    headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
  });

  expect(statusCode).toBe(200);
});
```

A 200 status doesn't guarantee the response contains the expected data. The endpoint could return an empty object or wrong structure.

**✅ Do validate the response body structure**

```ts
apiTest('should return autocomplete definitions', async ({ apiClient }) => {
  const { body, statusCode } = await apiClient.get('api/console/api_server', {
    headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
  });

  expect(statusCode).toBe(200);
  expect(body).toMatchObject({
    es: {
      endpoints: expect.any(Object),
      globals: expect.any(Object),
      name: 'es',
    },
  });
  expect(Object.keys(body.es.globals).length).toBeGreaterThan(0);
  expect(Object.keys(body.es.endpoints).length).toBeGreaterThan(0);
});
```

This catches issues like missing fields, wrong types, or empty collections that a status code check would miss.

---

## Contribute to Scout when possible

We welcome contributions to one of the Scout packages. This includes page objects, EUI wrappers, API helpers, and more.

| If your code...                               | Then...                                                                                                                                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Could be useful to **reuse in other plugins** | **Platform-wide** functionality should be contributed to `@kbn/scout`.<br/><br/>**Solution-specific** functionality should go to a solution-specific Scout package (e.g. `@kbn/scout-security`, `@kbn/scout-oblt`). |
| Is **specific to your plugin**                | Keep it in your plugin's test directory                                                                                                                                                                             |
