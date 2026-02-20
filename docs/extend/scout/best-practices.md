---
navigation_title: Best practices
---

# Best practices for Scout tests [scout-best-practices]

This guide covers best practices for writing Scout UI and API tests that are reliable, maintainable, and fast.

Scout is built on Playwright, so the official [Playwright Best Practices](https://playwright.dev/docs/best-practices) apply.

:::::{tip}
**New to Scout?** Start with our [Scout introduction page](../scout.md).
:::::

## Quick reference [quick-reference]

**UI and API tests**

| Question                                 | Section                                                                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| How should I **organize** my test files? | [Organize test suites by role and user flow](#organize-test-suites-by-role-and-user-flow)                              |
| Where should **shared setup** go?        | [Move repeated one-time setup to a global setup hook](#move-repeated-one-time-setup-operations-to-a-global-setup-hook) |
| Where should **cleanup code** go?        | [Put cleanup code in hooks, not in the test body](#put-cleanup-code-in-hooks-not-in-the-test-body)                     |
| Where should **shared values** live?     | [Use constants for shared test values](#use-constants-for-shared-test-values)                                          |
| What **permissions** should my test use? | [Test with minimal permissions](#test-with-minimal-permissions-avoid-admin-when-possible)                              |
| How do I know if my test is **flaky**?   | [Run tests multiple times to catch flakiness](#use-the-flaky-test-runner-to-catch-flaky-tests-early)                   |

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
| My test keeps failing — should I add **retries**?                    | [Don't use manual retry loops — fix the source code](#dont-use-manual-retry-loops)                            |
| Should I **contribute** my page object to Scout?                     | [Contribute to Scout when possible](#contribute-to-scout-when-possible)                                       |

**API tests**

| Question                        | Section                                                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Which **fixture** should I use? | [Validate endpoints with `apiClient`](#validate-endpoints-with-apiclient-for-readable-and-scoped-tests)                       |
| What should I **assert**?       | [Don't just verify the status code, validate the response body](#dont-just-verify-the-status-code-validate-the-response-body) |

---

## UI & API tests [ui-and-api-tests]

Best practices that apply to both UI and API tests.

### Design tests with a cloud-first mindset [design-tests-with-a-cloud-first-mindset]

Scout is deployment-agnostic: write once, run locally and on Elastic Cloud.

- Tag suites with [deployment tags](./deployment-tags.md) and use `--grep` to target environments.
- Prefer portable assumptions: don’t depend on “special” Cloud deployment tweaks for correctness.

### Run tests multiple times to catch flakiness [use-the-flaky-test-runner-to-catch-flaky-tests-early]

When you add new tests, fix flakes, or make significant changes, run the same tests multiple times to catch flakiness early. A good starting point is **20–50 runs**.

Prefer doing this locally first (faster feedback), and use the Flaky Test Runner in CI when needed.

For how to reproduce flakiness locally and in CI (including `--grep` guidance), see [Debug flaky tests](./debugging.md#scout-debugging-flaky-tests).

```bash
/flaky scoutConfig:<Playwright config path>:<number of runs>
```

### Keep test suites independent [keep-test-suites-independent]

- Keep **one top-level suite** per file (`test.describe`).
- Avoid nested `describe` blocks. Use `test.step` for structure inside a test.
- Don’t rely on test file execution order (it’s [not guaranteed](https://playwright.dev/docs/test-parallel#control-test-order)).

### Organize test suites by role and user flow [organize-test-suites-by-role-and-user-flow]

Prefer “one role + one flow per file”. Put shared login/navigation in `beforeEach`.

```ts
// dashboard_viewer.spec.ts
test.beforeEach(async ({ browserAuth, pageObjects }) => {
  await browserAuth.loginAsViewer();
  await pageObjects.dashboard.goto();
});

test('can see dashboard', async ({ page }) => {
  // assertions...
});
```

### Use a global setup hook for one-time setup [move-repeated-one-time-setup-operations-to-a-global-setup-hook]

If many files share the same “one-time” work (archives, API calls, settings), move it to a [global setup hook](./global-setup-hook.md).

```ts
globalSetupHook('Load shared test data (if needed)', async ({ esArchiver, log }) => {
  log.debug('[setup] loading archives (only if indexes do not exist)...');
  await esArchiver.loadIfNeeded(MY_ARCHIVE);
});
```

### Keep cleanup in hooks [put-cleanup-code-in-hooks-not-in-the-test-body]

Cleanup in the test body doesn’t run after a failure. Prefer `afterEach` / `afterAll`.

```ts
test.afterEach(async ({ esClient, log }) => {
  try {
    await esClient.indices.delete({ index: testIndexName });
  } catch (e: any) {
    log.debug(`Index cleanup failed: ${e.message}`);
  }
});
```

### Use constants for shared test values [use-constants-for-shared-test-values]

If a value is reused across suites (archive paths, fixed time ranges, endpoints, common headers), extract it into a shared `constants.ts` file. This reduces duplication and typos, and makes updates safer.

```ts
// test/scout/ui/constants.ts
export const LENS_BASIC_TIME_RANGE = {
  from: 'Sep 22, 2015 @ 00:00:00.000',
  to: 'Sep 23, 2015 @ 00:00:00.000',
};

export const DASHBOARD_SAVED_SEARCH_ARCHIVE =
  'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana';

export const DASHBOARD_DEFAULT_INDEX_TITLE = 'logstash-*';

// test/scout/api/constants.ts
export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
} as const;
```

### Test with minimal permissions [test-with-minimal-permissions-avoid-admin-when-possible]

Avoid `admin` unless there’s no alternative. Minimal permissions catch real permission bugs and keep tests realistic.

See [browser authentication](./browser-auth.md) and [API authentication](./api-auth.md).

```ts
await browserAuth.loginWithCustomRole('logs_analyst', {
  elasticsearch: {
    indices: [{ names: ['logs-*'], privileges: ['read'] }],
  },
  kibana: [{ spaces: ['*'], base: [], feature: { discover: ['read'] } }],
});
```

---

## UI tests [ui-tests]

Best practices specific to UI tests.

### Prefer parallel runs [run-tests-in-parallel-whenever-possible]

Default to [parallel UI suites](./parallelism.md) when possible. Parallel workers share the same Kibana/ES deployment, but run in isolated Spaces.

| Run in **parallel**                                                                                 | Run **sequentially**                           |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| UI tests (most suites)                                                                              | API tests                                      |
| Suites that can share pre-ingested data (often via the [global setup hook](./global-setup-hook.md)) | Suites requiring a “clean” Elasticsearch state |

### Use `test.step` for multi-step flows [use-teststep-for-multi-step-flows]

Use `test.step()` to structure a multi-step flow while keeping one browser context (faster, clearer reporting).

```ts
test('navigates through pages', async ({ pageObjects }) => {
  await test.step('go to Dashboards', async () => {
    await pageObjects.navigation.clickDashboards();
  });

  await test.step('go to Overview', async () => {
    await pageObjects.navigation.clickOverview();
  });
});
```

### Test behavior, not data correctness [focus-ui-tests-on-behavior-not-data-correctness]

Keep UI tests focused on:

- layout and rendering
- navigation and interaction
- “does this feature work” at a user level

Validate data correctness and edge cases with API/unit tests instead.

```ts
// basic render checks: table is visible, expected headers exist
await expect(page.testSubj.locator('datasetQualityTable-loaded')).toBeVisible();
await expect(page.testSubj.locator('datasetQualityTable').locator('th')).toContainText([
  'Dataset',
  'Last Activity',
]);
```

### Prefer APIs for setup and teardown [prefer-kibana-apis-over-ui-for-setup-and-teardown]

Setup/teardown via UI is slow and brittle. Prefer Kibana APIs and fixtures.

```ts
test.beforeEach(async ({ uiSettings, kbnClient }) => {
  await uiSettings.setDefaultTime({ from: startTime, to: endTime });
  await kbnClient.importExport.load(DATA_VIEW_ARCHIVE_PATH);
});
```

### Skip onboarding with `addInitScript` [skip-onboarding-flows-with-addinitscript]

If a page has onboarding/getting-started state, set localStorage before navigation.

```ts
test.beforeEach(async ({ page, browserAuth, pageObjects }) => {
  await browserAuth.loginAsViewer();
  await page.addInitScript(() => {
    window.localStorage.setItem('gettingStartedVisited', 'true');
  });
  await pageObjects.homepage.goto();
});
```

### Use Playwright auto-waiting [leverage-playwright-auto-waiting]

Playwright actions and [web-first assertions](https://playwright.dev/docs/best-practices#use-web-first-assertions) already wait/retry.

- Avoid “pre-waits” like `waitForSelector()` before `click()`/`fill()` unless the **next step** depends on a new UI state (see below).
- Avoid manual `waitFor()` before assertions like `toBeVisible()`—they already retry.

```ts
await page.testSubj.click('myButton');
await expect(page.testSubj.locator('successToast')).toBeVisible();
```

### Don't use manual retry loops [dont-use-manual-retry-loops]

If an action fails, don’t wrap it in a retry loop. Playwright already waits for actionability; repeated failures usually point to an app issue (unstable DOM, non-unique selectors, re-render bugs).

If you need retries to make a test pass, fix the component or make your waiting/locators explicit and stable.

### Locate UI elements reliably [locate-ui-elements-reliably]

Prefer stable `data-test-subj` attributes accessed via `page.testSubj`.

```ts
// verbose
await page.click('[data-test-subj="myButton"]');

// preferred
await page.testSubj.click('myButton');
```

If `data-test-subj` is missing, prefer adding one to source code. If that’s not possible, use `getByRole` **inside a scoped container**:

```ts
await page.testSubj.locator('confirmDeleteModal').getByRole('button', { name: 'Delete' }).click();
```

Avoid `getByText` for primary selectors; text changes and translations make it fragile.

### Use Scout's default timeouts [use-scouts-default-timeouts]

Scout configures Playwright timeouts ([source](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-scout/src/playwright/config/create_config.ts)). Prefer defaults.

- Don’t override suite-level timeouts/retries with `test.describe.configure()` unless you have a strong reason.
- If you increase a timeout for one operation, keep it well below the test timeout and leave a short rationale.

```ts
await expect(editor).toBeVisible(); // default timeout

// justified: report generation can be slow
await expect(downloadBtn).toBeEnabled({ timeout: 30_000 });
```

### Wait when the next step depends on it [wait-for-ui-updates-when-the-next-action-requires-it]

Don’t “wait everywhere”. Add explicit waits when an action triggers UI work that the next step depends on.

```ts
await page.gotoApp('sample/page/here');
await page.testSubj.waitForSelector('mainContent', { state: 'visible' });
```

### Wait for complex UI to finish rendering [wait-for-complex-components-to-fully-render]

Tables/maps/visualizations can appear before data is rendered. Prefer waiting on an explicit “loaded” signal (ideally exposed by the component).

In source code, use a dynamic `data-test-subj`:

```tsx
<EuiBasicTable
  data-test-subj={`myTable-${isLoading ? 'loading' : 'loaded'}`}
  loading={isLoading}
  items={items}
  columns={columns}
/>
```

In tests, wait for the loaded state:

```ts
await expect(page.testSubj.locator('myTable-loaded')).toBeVisible();
```

For Kibana Maps, `data-render-complete="true"` is often the right “ready” signal.

### Page object tips [page-object-tips]

These tips complement the dedicated docs on [page objects](./page-objects.md).

#### Use existing page objects to interact with the Kibana UI [use-existing-page-objects-to-interact-with-the-kibana-ui]

Prefer existing page objects (and their methods) over rebuilding EUI interactions in test files.

```ts
await pageObjects.datePicker.setAbsoluteRange({
  from: 'Sep 19, 2015 @ 06:31:44.000',
  to: 'Sep 23, 2015 @ 18:31:44.000',
});
```

#### Abstract common operations in page object methods [abstract-common-operations-in-page-object-methods]

Create methods for repeated flows (and make them wait for readiness).

```ts
async openNewDashboard() {
  await this.page.testSubj.click('newItemButton');
  await this.page.testSubj.waitForSelector('emptyDashboardWidget', { state: 'visible' });
}
```

#### Keep assertions explicit in tests, not hidden in page objects [keep-assertions-explicit-in-tests-not-hidden-in-page-objects]

Prefer explicit `expect()` in the test file so reviewers can see intent and failure modes.

```ts
await pageObjects.indexManagement.clickCreateIndexSaveButton();
await expect(page.testSubj.locator('indicesTable')).toContainText(testIndexName);
```

#### Use EUI wrappers as class fields in page objects [use-eui-wrappers-as-class-fields-in-page-objects]

If you must interact with EUI internals, use wrappers from Scout to keep that complexity out of tests.

```ts
import { EuiComboBoxWrapper, ScoutPage } from '@kbn/scout';

export class StreamsAppPage {
  public readonly fieldComboBox: EuiComboBoxWrapper;

  constructor(private readonly page: ScoutPage) {
    this.fieldComboBox = new EuiComboBoxWrapper(this.page, 'fieldSelectorComboBox');
  }

  async selectField(value: string) {
    await this.fieldComboBox.selectSingleOption(value);
  }
}
```

### Contribute to Scout when possible [contribute-to-scout-when-possible]

If you build a helper that will benefit other tests, consider upstreaming it:

- **Reusable across many plugins/teams**: contribute to `@kbn/scout`
- **Reusable but solution-scoped**: contribute to the relevant solution Scout package
- **Plugin-specific**: keep it in your plugin’s `test/scout` tree

For the full guidance, see [Scout](../scout.md#contribute-to-scout-when-possible).

---

## API tests [api-tests]

Best practices specific to API tests.

### Validate endpoints with `apiClient` [validate-endpoints-with-apiclient-for-readable-and-scoped-tests]

Use the right fixture for the right purpose:

| Fixture                       | Use for                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `apiClient`                   | The endpoint under test (with scoped credentials from [API auth](./api-auth.md)) |
| `apiServices`                 | Setup/teardown and side effects                                                  |
| `kbnClient`, `esClient`, etc. | Lower-level setup when `apiServices` doesn’t have a suitable helper              |

Prefer tests that read like “call endpoint X as role Y, assert outcome”.

```ts
apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
  await apiServices.myFeature.createTestData();
  viewerCredentials = await requestAuth.getApiKeyForViewer();
});

apiTest('returns data for viewer', async ({ apiClient }) => {
  const { body, statusCode } = await apiClient.get('api/my-feature/data', {
    headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
  });

  expect(statusCode).toBe(200);
  expect(body.items).toHaveLength(3);
});
```

This pattern validates both endpoint behavior and the [permission model](#test-with-minimal-permissions-avoid-admin-when-possible).

### Validate the response body (not just status) [dont-just-verify-the-status-code-validate-the-response-body]

Status code assertions are necessary but not sufficient—also validate shape and key fields.

```ts
apiTest('returns autocomplete definitions', async ({ apiClient }) => {
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
});
```
