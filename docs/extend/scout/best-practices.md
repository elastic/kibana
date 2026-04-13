---
navigation_title: Best practices
---

# Best practices for Scout tests [scout-best-practices]

This guide covers best practices for writing Scout UI and API tests that are reliable, maintainable, and fast.

Scout is built on Playwright, so the official [Playwright Best Practices](https://playwright.dev/docs/best-practices) apply.

:::::{tip}
**New to Scout?** Start with our [Scout introduction page](../scout.md).
:::::

## UI & API tests [ui-and-api-tests]

Best practices that apply to both UI and API tests.

### Design tests with a cloud-first mindset [design-tests-with-a-cloud-first-mindset]

Scout is deployment-agnostic: write once, run locally and on Elastic Cloud.

- Every suite must have [deployment tags](./deployment-tags.md). Use tags to target the environments where your tests apply (for example, a feature that only exists in stateful deployments).
- Within a test, avoid relying on configuration, data, or behavior specific to a single deployment. Test logic should produce the same result locally and on Cloud.
- Run your tests against a real Elastic Cloud project before merging to catch environment-specific surprises early. See [Run tests on Elastic Cloud](./run-tests.md#scout-run-tests-cloud) for setup instructions.

### Prefer runtime feature flags [prefer-runtime-feature-flags]

When a feature is gated behind a flag, enable it at runtime with `apiServices.core.settings()` rather than creating a custom server config. Runtime flags work locally and on Cloud, don’t require a server restart, and avoid the CI cost of a dedicated server instance.

For the full guide (including when a custom server config is unavoidable), see [Feature flags](./feature-flags.md).

### Run tests multiple times to catch flakiness [use-the-flaky-test-runner-to-catch-flaky-tests-early]

When you add new tests, fix flakes, or make significant changes, run the same tests multiple times to catch flakiness early. A good starting point is **20–50 runs**.

Prefer doing this locally first (faster feedback), and use the Flaky Test Runner in CI when needed. See [Debug flaky tests](./debugging.md#scout-debugging-flaky-tests) for guidance.

### Keep test suites independent [keep-test-suites-independent]

- Keep **one top-level suite** per file (`test.describe`).
- Avoid nested `describe` blocks. Use `test.step` for structure inside a test.
- Don’t rely on test file execution order (it’s [not guaranteed](https://playwright.dev/docs/test-parallel#control-test-order)).

### Write descriptive test names [write-descriptive-test-names]

Test names should read like a sentence describing expected behavior. Clear names make failures self-explanatory and test suites scannable.

:::::{dropdown} Examples
❌ **Don’t:**

```ts
test('test 1', async ({ page }) => {
  /* ... */
});
test('works correctly', async ({ page }) => {
  /* ... */
});
```

❌ **Don’t:** use variables or template literals in test titles as they look opaque in stack traces and test reports:

```ts
test(`handles ${dataView.title} correctly`, async ({ page }) => {
  /* ... */
});
```

✔️ **Do:**

```ts
test('viewer can see dashboard but cannot edit', async ({ page }) => {
  /* ... */
});
test('returns 403 when missing read privilege', async ({ apiClient }) => {
  /* ... */
});
```

:::::

### Organize test suites by role and user flow [organize-test-suites-by-role-and-user-flow]

Prefer “one role + one flow per file” and keep spec files small (roughly 4–5 short tests or 2–3 longer ones). The test runner balances work at the spec-file level, so oversized files become bottlenecks during [parallel execution](./parallelism.md). Put shared login/navigation in `beforeEach`.

:::::{dropdown} Example

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

:::::

### Use a global setup hook for one-time setup [move-repeated-one-time-setup-operations-to-a-global-setup-hook]

If many files share the same “one-time” work (archives, API calls, settings), move it to a [global setup hook](./global-setup-hook.md).

:::::{dropdown} Example

```ts
globalSetupHook('Load shared test data (if needed)', async ({ esArchiver, log }) => {
  log.debug('[setup] loading archives (only if indexes do not exist)...');
  await esArchiver.loadIfNeeded(MY_ARCHIVE);
});
```

:::::

### Only load archives your tests actually use [only-load-archives-your-tests-actually-use]

It’s common for test suites to load Elasticsearch or Kibana archives that are barely used (or not used at all). Unused archives slow down setup, waste resources, and make it harder to understand what a test actually depends on. Check if your tests ingest the data they actually need.

Use `esArchiver.loadIfNeeded()`, which skips ingestion if the index and documents already exist (useful when multiple suites share the same data).

:::::{dropdown} Examples
❌ **Don’t:** load archives that no test in the suite relies on:

```ts
test.beforeAll(async ({ esArchiver }) => {
  await esArchiver.loadIfNeeded('large_metrics_archive');
  await esArchiver.loadIfNeeded('user_actions_archive');
});

test('shows metrics dashboard', async ({ page }) => {
  // only uses large_metrics_archive — user_actions_archive is never referenced
});
```

✔️ **Do:** load only what the suite needs:

```ts
test.beforeAll(async ({ esArchiver }) => {
  await esArchiver.loadIfNeeded('large_metrics_archive');
});
```

:::::

### Keep cleanup in hooks [put-cleanup-code-in-hooks-not-in-the-test-body]

Cleanup in the test body doesn’t run after a failure. Prefer `afterEach` / `afterAll`.

:::::{dropdown} Examples
❌ **Don’t:** put cleanup at the end of the test body (it’s skipped if the test fails):

```ts
test('creates and deletes index', async ({ esClient }) => {
  await esClient.indices.create({ index: testIndexName });
  // ... assertions ...
  await esClient.indices.delete({ index: testIndexName }); // skipped on failure!
});
```

✔️ **Do:** use hooks so cleanup always runs:

```ts
test.afterEach(async ({ esClient, log }) => {
  try {
    await esClient.indices.delete({ index: testIndexName });
  } catch (e: any) {
    log.debug(`Index cleanup failed: ${e.message}`);
  }
});
```

:::::

### Don’t use `try/catch` in tests [dont-use-try-catch-in-tests]

Tests should be clean and declarative. If a helper might return an expected error (for example, 404 during cleanup), the helper should handle it internally, for example by accepting an `ignoreErrors` option or treating a 404 during deletion as a success.

:::::{dropdown} Examples
❌ **Don’t:** catch errors in the test:

```ts
test.afterAll(async ({ apiServices }) => {
  try {
    await apiServices.cases.delete(caseId);
  } catch {
    // might already be deleted
  }
});
```

✔️ **Do:** let the helper handle expected errors:

```ts
test.afterAll(async ({ apiServices }) => {
  await apiServices.cases.cleanup.deleteAllCases();
});
```

:::::

### Use constants for shared test values [use-constants-for-shared-test-values]

If a value is reused across suites (archive paths, fixed time ranges, endpoints, common headers), extract it into a shared `constants.ts` file. This reduces duplication and typos, and makes updates safer.

:::::{dropdown} Example

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

:::::

### Test with minimal permissions [test-with-minimal-permissions-avoid-admin-when-possible]

Avoid `admin` unless there’s no alternative. Minimal permissions catch real permission bugs and keep tests realistic. Also test the forbidden path: verify that an under-privileged role receives `403` for endpoints it shouldn’t access.

See [browser authentication](./browser-auth.md) and [API authentication](./api-auth.md).

:::::{dropdown} Examples
❌ **Don’t:** default to `admin` for convenience:

```ts
test.beforeEach(async ({ browserAuth }) => {
  await browserAuth.loginAsAdmin();
});
```

✔️ **Do:** use a built-in role when it fits (`viewer`, `editor`, etc.), or create a custom one for tighter scoping:

```ts
// built-in role
await browserAuth.loginAsViewer();

// custom role for finer-grained control
await browserAuth.loginWithCustomRole('logs_analyst', {
  elasticsearch: {
    indices: [{ names: ['logs-*'], privileges: ['read'] }],
  },
  kibana: [{ spaces: ['*'], base: [], feature: { discover: ['read'] } }],
});
```

:::::

:::::{dropdown} Tip: extend browserAuth for repeated roles
If the same custom role appears in many specs, extract it into a `browserAuth` fixture extension instead of repeating the role descriptor everywhere. Tests then read like intent:

```ts
// in your plugin's fixtures/index.ts
await use({
  ...browserAuth,
  loginAsPlatformEngineer: () =>
    browserAuth.loginWithCustomRole('platform_engineer', roleDescriptor),
});

// in specs
await browserAuth.loginAsPlatformEngineer();
```

For setup details, see [Reuse role helpers](./browser-auth.md#scout-browser-auth-extend).
:::::

---

## UI tests [ui-tests]

Best practices specific to UI tests.

### Prefer parallel runs [run-tests-in-parallel-whenever-possible]

Default to [parallel UI suites](./parallelism.md) when possible. Parallel workers share the same Kibana/ES deployment, but run in isolated Spaces.

| Mode           | When to use                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Parallel**   | UI tests (most suites), suites that share pre-ingested data (often using the [global setup hook](./global-setup-hook.md)) |
| **Sequential** | API tests, suites that require a “clean” Elasticsearch state                                                              |

### Test behavior, not data correctness [focus-ui-tests-on-behavior-not-data-correctness]

UI tests should answer “does this feature work for the user?” Verify that components render, respond to interaction, and navigate correctly. Leave exact data validation (computed values, aggregation results, edge cases) to API or unit tests, which are faster and less brittle.

| What you’re testing                                                         | Recommended layer  |
| --------------------------------------------------------------------------- | ------------------ |
| User flows, navigation, rendering                                           | Scout UI test      |
| Data correctness, API contracts, edge cases                                 | Scout API test     |
| Isolated component logic (loading/error states, tooltips, field validation) | RTL/Jest unit test |

:::::{dropdown} Examples
❌ **Don’t:** verify computed values that belong in an API test:

```ts
await expect(page.testSubj.locator('row-0-col-count')).toHaveText('1,024');
await expect(page.testSubj.locator('row-0-col-avg')).toHaveText('42.7');
```

✔️ **Do:** verify that the UI renders and responds to interaction:

```ts
await expect(page.testSubj.locator('datasetQualityTable-loaded')).toBeVisible();
await page.testSubj.click('tableSortByLastActivity');
await expect(page.testSubj.locator('row-0-col-dataset')).not.toHaveText('');
```

:::::

### Use `test.step` for multi-step flows [use-teststep-for-multi-step-flows]

Use `test.step()` to structure a multi-step flow while keeping one browser context (faster, clearer reporting).

:::::{dropdown} Example

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

:::::

### Prefer APIs for setup and teardown [prefer-kibana-apis-over-ui-for-setup-and-teardown]

Setup/teardown using UI is slow and brittle. Prefer Kibana APIs and fixtures.

:::::{dropdown} Examples
❌ **Don’t:** create test data through the UI:

```ts
test.beforeEach(async ({ page, browserAuth }) => {
  await browserAuth.loginAsAdmin();
  await page.testSubj.click('createDataViewButton');
  await page.testSubj.fill('indexPatternInput', 'logs-*');
  await page.testSubj.click('saveDataViewButton');
});
```

✔️ **Do:** use API fixtures:

```ts
test.beforeEach(async ({ uiSettings, kbnClient }) => {
  await uiSettings.setDefaultTime({ from: startTime, to: endTime });
  await kbnClient.importExport.load(DATA_VIEW_ARCHIVE_PATH);
});
```

:::::

### Use Playwright auto-waiting [leverage-playwright-auto-waiting]

Playwright actions and [web-first assertions](https://playwright.dev/docs/best-practices#use-web-first-assertions) already wait/retry. Don’t add redundant waits, and never use `page.waitForTimeout()` as it’s a hard sleep with no readiness signal and a common source of flakiness.

:::::{dropdown} Examples
❌ **Don’t:** add unnecessary waits before actions or assertions:

```ts
await page.testSubj.waitForSelector('myButton', { state: 'visible' });
await page.testSubj.click('myButton');
await page.testSubj.locator('successToast').waitFor();
await expect(page.testSubj.locator('successToast')).toBeVisible();
```

✔️ **Do:** let Playwright handle waiting automatically:

```ts
await page.testSubj.click('myButton');
await expect(page.testSubj.locator('successToast')).toBeVisible();
```

:::::

### Wait for UI updates after actions [wait-for-ui-updates-when-the-next-action-requires-it]

When an action triggers async UI work (navigation, saving, loading data), wait for the resulting state before your next step. This ensures the UI is ready and prevents flaky interactions with elements that haven’t rendered yet.

:::::{dropdown} Example

```ts
await page.gotoApp('sample/page/here');
await page.testSubj.waitForSelector('mainContent', { state: 'visible' });
```

:::::

### Don't use manual retry loops [dont-use-manual-retry-loops]

If an action fails, don't wrap it in a retry loop. Playwright already waits for actionability; repeated failures usually point to an app issue (unstable DOM, non-unique selectors, re-render bugs). Fix the component or make your waiting/locators explicit and stable.

:::::{dropdown} Examples
❌ **Don't:** retry actions in a loop:

```ts
for (let i = 0; i < 3; i++) {
  try {
    await page.testSubj.click('submitButton');
    break;
  } catch {
    await page.waitForTimeout(1000);
  }
}
```

✔️ **Do:** fix the root cause (for example, wait for a readiness signal):

```ts
await expect(page.testSubj.locator('formReady')).toBeVisible();
await page.testSubj.click('submitButton');
```

:::::

### Locate UI elements reliably [locate-ui-elements-reliably]

Prefer stable `data-test-subj` attributes accessed using `page.testSubj`. If `data-test-subj` is missing, prefer adding one to source code. If that’s not possible, use `getByRole` **inside a scoped container**.

:::::{dropdown} Examples
❌ **Don’t:** use raw CSS selectors or unscoped text matchers (searching the entire page for text is unreliable when duplicates exist):

```ts
await page.click('[data-test-subj="myButton"]');
await page.getByText('Delete').click();
```

❌ **Don’t:** select elements by index ([flagged by Playwright’s recommended ESLint rules](https://playwright.dev/docs/best-practices)), as they break on non-clean environments where tests run without server restart and extra data may exist:

```ts
await page.testSubj.locator('tableRow').nth(0).click();
```

✔️ **Do:** use `page.testSubj` or scoped `getByRole`:

```ts
await page.testSubj.click('myButton');
await page.testSubj.locator('confirmDeleteModal').getByRole('button', { name: 'Delete' }).click();
```

:::::

### Use Scout's default timeouts [use-scouts-default-timeouts]

Scout configures Playwright timeouts ([source](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-scout/src/playwright/config/create_config.ts)). Prefer defaults.

- Don’t override suite-level timeouts/retries with `test.describe.configure()` unless you have a strong reason.
- If you increase a timeout for one operation, keep it well below the test timeout and leave a short rationale. An assertion timeout that exceeds the test timeout is ignored.
- Time spent in hooks (`beforeEach`, `afterEach`) counts toward the test timeout. If setup is slow, the test itself may time out even though its assertions are fast.

:::::{dropdown} Example

```ts
await expect(editor).toBeVisible(); // will use the default timeout

// justified: report generation can be slow
await expect(downloadBtn).toBeEnabled({ timeout: 30_000 });
```

:::::

### Wait for complex UI to finish rendering [wait-for-complex-components-to-fully-render]

Tables/maps/visualizations can appear before data is rendered. Prefer waiting on a component-specific **“loaded” signal** rather than global indicators like the Kibana chrome spinner (our data shows they are unreliable for confirming that a particular component has finished rendering).

:::::{dropdown} Example
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
:::::

### Use existing page objects to interact with the Kibana UI [use-existing-page-objects-to-interact-with-the-kibana-ui]

Prefer existing page objects (and their methods) over rebuilding EUI interactions in test files.

:::::{dropdown} Example

```ts
await pageObjects.datePicker.setAbsoluteRange({
  from: 'Sep 19, 2015 @ 06:31:44.000',
  to: 'Sep 23, 2015 @ 18:31:44.000',
});
```

:::::

### Abstract common operations in page object methods [abstract-common-operations-in-page-object-methods]

Create methods for repeated flows (and make them [wait for readiness](#wait-for-ui-updates-when-the-next-action-requires-it)).

:::::{dropdown} Example

```ts
async openNewDashboard() {
  await this.page.testSubj.click('newItemButton');
  await this.page.testSubj.waitForSelector('emptyDashboardWidget', { state: 'visible' });
}
```

:::::

### Avoid conditional logic in page objects and tests [avoid-conditional-logic-in-page-objects]

Playwright creates a fresh browser context for each test, so there is no cached state to work around. Both page object methods and test code should be explicit about the action they perform, not defensive about the current state. Conditional flows (like "if modal is open, close it first") hide bugs, waste time, and make failures harder to understand.

:::::{dropdown} Examples
❌ **Don’t:** add conditional logic to handle unknown state:

```ts
async switchToEditMode() {
  const isViewMode = await this.page.testSubj.locator('dashboardViewMode').isVisible();
  if (isViewMode) {
    await this.page.testSubj.click('dashboardEditMode');
  }
}
```

✔️ **Do:** make the action explicit, since the caller knows the expected state:

```ts
async openEditMode() {
  await this.page.testSubj.click('dashboardEditMode');
  await this.page.testSubj.waitForSelector('dashboardIsEditing', { state: 'visible' });
}
```

:::::

### Keep assertions explicit in tests, not hidden in page objects [keep-assertions-explicit-in-tests-not-hidden-in-page-objects]

Prefer explicit `expect()` in the test file so reviewers can see intent and failure modes. Also prefer `expect()` over manual boolean checks, as Playwright’s error output includes the locator, call log, and a clear message, which `if`/`throw` patterns lose.

:::::{dropdown} Examples
❌ **Don’t:** hide assertions inside page objects:

```ts
// inside page object
async createIndexAndVerify(name: string) {
  await this.page.testSubj.click('saveButton');
  await expect(this.page.testSubj.locator('indicesTable')).toContainText(name);
}
```

✔️ **Do:** keep assertions in the test file:

```ts
await pageObjects.indexManagement.clickCreateIndexSaveButton();
await expect(page.testSubj.locator('indicesTable')).toContainText(testIndexName);
```

:::::

### Use `expect.soft` for independent checks [use-expect-soft-for-independent-checks]

When a test verifies multiple independent items (KPI tiles, chart counts, table columns), use `expect.soft()` so the test continues checking everything instead of stopping at the first failure. Playwright still fails the test at the end if any soft assertion failed.

:::::{dropdown} Example

```ts
test('Overview tab shows all KPI values', async ({ pageObjects }) => {
  await pageObjects.nodeDetails.clickOverviewTab();
  await expect.soft(pageObjects.nodeDetails.getKPI('cpuUsage')).toHaveText('50.0%');
  await expect.soft(pageObjects.nodeDetails.getKPI('memoryUsage')).toHaveText('35.0%');
  await expect.soft(pageObjects.nodeDetails.getKPI('diskUsage')).toHaveText('80.0%');
});
```

:::::

### Use EUI wrappers as class fields in page objects [use-eui-wrappers-as-class-fields-in-page-objects]

If you must interact with EUI internals, use wrappers from Scout to keep that complexity out of tests.

:::::{dropdown} Example

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

:::::

### Add accessibility checks at key UI checkpoints [add-a11y-checks]

Scout supports automated accessibility (a11y) scanning via `page.checkA11y`. Add checks at high-value points in your UI tests (landing pages, modals, flyouts, wizard steps) rather than on every interaction.

:::::{dropdown} Example

```ts
const { violations } = await page.checkA11y({ include: ['[data-test-subj="myPanel"]'] });
expect(violations).toHaveLength(0);
```

:::::

For the full guide (scoping, exclusions, handling pre-existing violations), see [Accessibility testing](./a11y-checks.md).

### Skip onboarding with `addInitScript` [skip-onboarding-flows-with-addinitscript]

If a page has onboarding/getting-started state, set `localStorage` before navigation.

:::::{dropdown} Example

```ts
test.beforeEach(async ({ page, browserAuth, pageObjects }) => {
  await browserAuth.loginAsViewer();
  await page.addInitScript(() => {
    window.localStorage.setItem('gettingStartedVisited', 'true');
  });
  await pageObjects.homepage.goto();
});
```

:::::

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

:::::{dropdown} Example

```ts
import { expect } from '@kbn/scout/api';

apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
  await apiServices.myFeature.createTestData();
  viewerCredentials = await requestAuth.getApiKeyForViewer();
});

apiTest('returns data for viewer', async ({ apiClient }) => {
  const response = await apiClient.get('api/my-feature/data', {
    headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
  });

  expect(response).toHaveStatusCode(200);
  expect(response.body.items).toHaveLength(3);
});
```

:::::

This pattern validates both endpoint behavior and the [permission model](#test-with-minimal-permissions-avoid-admin-when-possible).

### Validate the response body (not just status) [dont-just-verify-the-status-code-validate-the-response-body]

Status code assertions are necessary but not sufficient. Also validate shape and key fields.

:::::{dropdown} Examples
❌ **Don’t:** assert only the status code:

```ts
apiTest('returns autocomplete definitions', async ({ apiClient }) => {
  const response = await apiClient.get('api/console/api_server', {
    headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
  });

  expect(response).toHaveStatusCode(200);
});
```

✔️ **Do:** validate shape and key fields too:

```ts
apiTest('returns autocomplete definitions', async ({ apiClient }) => {
  const response = await apiClient.get('api/console/api_server', {
    headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
  });

  expect(response).toHaveStatusCode(200);
  expect(response.body).toMatchObject({
    es: {
      endpoints: expect.any(Object),
      globals: expect.any(Object),
      name: 'es',
    },
  });
});
```

:::::
