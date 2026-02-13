# Parallel UI Tests (spaceTest + scoutSpace)

Use this when working under `.../test/scout*/ui/parallel_tests/` or a `parallel.playwright.config.ts`.

## Key rules

- Parallelism is file-level. Tests within one file still run sequentially.
- Use `spaceTest` (not `test`) so you can access `scoutSpace`.
- Tags are required: every `spaceTest.describe(...)` must include `{ tag: ... }`.
- Each worker gets a dedicated Kibana space; the fixture creates and deletes it automatically.
- Pre-ingest shared Elasticsearch data before workers start (global setup hook). Avoid ingesting or cleaning shared indices inside individual parallel tests.

## Minimal config + layout

- `ui/parallel.playwright.config.ts`: `testDir: './parallel_tests'`, `workers: 2..3`, optional `runGlobalSetup: true`.
- `ui/parallel_tests/global.setup.ts`: define `globalSetupHook(...)` (runs once total).

## Minimal pattern

```ts
import { spaceTest, tags } from '@kbn/scout'; // or the module's Scout package
import { expect } from '@kbn/scout/ui'; // or '@kbn/scout-oblt/ui', etc.

spaceTest.describe('my feature', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    // Worker-scoped setup in the isolated space.
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('does something', async ({ browserAuth, pageObjects, page }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.somePage.goto();
    await expect(page.testSubj.locator('someElement')).toBeVisible();
  });
});
```

## Global setup hook gotchas

- Global setup runs once total (executed by the first worker); other workers wait for it to finish.
- Only worker-scoped fixtures are available (for example `esArchiver`, `apiServices`, `kbnClient`, `esClient`, `log`).
- No `page`, `browserAuth`, or `pageObjects` in `global.setup.ts`.
