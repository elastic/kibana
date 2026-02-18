---
navigation_title: Parallelism
---

# Parallelism [scout-parallelism]

Scout supports parallel test runs using [native Playwright workers](https://playwright.dev/docs/test-parallel). Parallel runs speed up execution. Tests share a single Kibana and Elasticsearch instance for cost-efficiency and realistic simulation.

:::::{warning}
**Test files** run in parallel, not individual tests. Tests in a single file run in order, in the same worker process.
:::::

## How does this work? [scout-parallelism-how]

In parallel tests, each worker is assigned to a dedicated Kibana space that is automatically created by the `scoutSpace` fixture. This ensures workers run in isolation and can independently manage saved objects and UI settings.

You are free to update saved objects and UI settings inside parallel test suites. When a worker terminates, the space it was assigned to is deleted by the fixture.

:::::{note}
Even though the `workplace_ai` solution doesn't support spaces, you can still write parallel tests for it.
:::::

## Differences between parallel and sequential tests [scout-parallelism-differences]

Main differences:

- Each parallel worker runs in its own Kibana space, ensuring isolation.
- Parallel tests are faster than sequential tests because they utilize multiple workers.
- Parallel tests require Elasticsearch data to be ingested **before** workers start (for example, via a global setup hook). Pre-ingesting data avoids interfering with other workers.

## Enable parallel tests [enable-parallel-tests]

First, ensure you have [set up your plugin or package](./setup-plugin.md) to work with Scout.

To enable parallel test runs:

### 1. Configure workers [parallel-config-workers]

Set `workers` to a value greater than 1 in your Playwright config (currently Scout supports up to 3 workers to reduce load on the shared cluster):

```ts
import { createPlaywrightConfig } from '@kbn/scout'; <1>

export default createPlaywrightConfig({
  testDir: './parallel_tests', <2>
  workers: 2, <3>
  runGlobalSetup: true, // optional to run a global setup hook
});
```

1. Import from `@kbn/scout-oblt` or `@kbn/scout-security` if your plugin belongs to a specific solution.
2. Add test files that should run in parallel to the `parallel_tests` directory.
3. Up to 3 workers are supported.

### 2. (Recommended) Add a global setup hook [parallel-global-setup]

Create a [global setup hook](./global-setup-hook.md) to ingest Elasticsearch data before the parallel tests start:

```ts
import { globalSetupHook } from '@kbn/scout'; <1>
import { testData } from '../fixtures';

globalSetupHook('Ingest data to Elasticsearch', async ({ esArchiver, log }) => { <2>
  const archives = [
    testData.ES_ARCHIVES.LOGSTASH,
    testData.ES_ARCHIVES.NO_TIME_FIELD,
    testData.ES_ARCHIVES.ECOMMERCE,
  ];

  log.debug('[setup] loading test data (only if indices do not exist)...');
  for (const archive of archives) {
    await esArchiver.loadIfNeeded(archive);
  }
});
```

1. Import from `@kbn/scout-oblt` or `@kbn/scout-security` if your plugin belongs to a specific solution.
2. Use worker-scoped fixtures like `esArchiver` in the global setup hook.

### 3. Use `spaceTest` in parallel suites [parallel-spaceTest]

Use `spaceTest` (from `@kbn/scout`, or your solution’s Scout package) to access the `scoutSpace` fixture:

```ts
import { spaceTest, tags } from '@kbn/scout'; <1>
import { expect } from '@kbn/scout/ui'; <1>
import { testData, assertionMessages } from '../fixtures';

spaceTest.describe(
  'Discover app - value suggestions: useTimeRange enabled',
  { tag: tags.DEPLOYMENT_AGNOSTIC },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => { <2>
      await scoutSpace.savedObjects.load(testData.KBN_ARCHIVES.DASHBOARD_DRILLDOWNS); <3>
      await scoutSpace.uiSettings.setDefaultIndex(testData.DATA_VIEW_NAME.LOGSTASH); <4>
      await scoutSpace.uiSettings.setDefaultTime({
        from: testData.LOGSTASH_DEFAULT_START_TIME,
        to: testData.LOGSTASH_DEFAULT_END_TIME,
      });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('dont show up if outside of range', async ({ page, pageObjects }) => {
      await pageObjects.datePicker.setAbsoluteRange(testData.LOGSTASH_OUT_OF_RANGE_DATES);
      await page.testSubj.fill('queryInput', 'extension.raw : ');
      await expect(page.testSubj.locator('autoCompleteSuggestionText')).toHaveCount(0);
    });

    spaceTest('show up if in range', async ({ page, pageObjects }) => {
      await pageObjects.datePicker.setAbsoluteRange(testData.LOGSTASH_IN_RANGE_DATES);
      await page.testSubj.fill('queryInput', 'extension.raw : ');
      await expect(
        page.testSubj.locator('autoCompleteSuggestionText'),
        assertionMessages.QUERY_BAR_VALIDATION.SUGGESTIONS_COUNT
      ).toHaveCount(5);
      const actualSuggestions = await page.testSubj
        .locator('autoCompleteSuggestionText')
        .allTextContents();
      expect(actualSuggestions.join(',')).toContain('jpg');
    });

    spaceTest('also displays descriptions for operators', async ({ page, pageObjects }) => {
      await pageObjects.datePicker.setAbsoluteRange(testData.LOGSTASH_IN_RANGE_DATES);
      await page.testSubj.fill('queryInput', 'extension.raw');
      await expect(page.testSubj.locator('^autocompleteSuggestion-operator')).toHaveCount(2);
    });
  }
);
```

1. Import from `@kbn/scout-oblt` or `@kbn/scout-security` if your plugin belongs to a specific solution.
2. `scoutSpace` is a worker-scoped fixture available inside `spaceTest` suites.
3. Load saved objects into the isolated space.
4. Set UI settings and unset them in `afterAll`.

## API tests and parallelism [api-tests-and-parallelism]

Parallel execution for API tests is not yet supported.

If/when API parallelism is introduced, it will require careful isolation. While UI tests are automatically scoped to unique Kibana Spaces, API tests would require explicit isolation (for example: passing a Space ID where supported and avoiding shared-state mutations like index changes).

## Best practices [scout-parallelism-best-practices]

- If you ingest Elasticsearch data in `global.setup.ts`, do not remove or update it in tests using `esClient`.
- If you ingest Elasticsearch data with `esArchiver`, you don’t need to unload it (so it can be reused by other tests).
- If you update UI settings or create saved objects, clean them up in `afterAll`.
- If you need to test a feature that requires restricting space capabilities, do so in a sequential suite.

