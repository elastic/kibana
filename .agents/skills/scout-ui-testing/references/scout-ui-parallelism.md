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
- `ui/parallel_tests/global.teardown.ts` (optional): define `globalTeardownHook(...)` to reset cluster/Kibana state once after the suite. Picked up automatically when `runGlobalSetup: true`; no extra config flag.

## Minimal pattern

```ts
import { spaceTest, tags } from '@kbn/scout'; // or the module's Scout package
import { expect } from '@kbn/scout/ui'; // or '@kbn/scout-oblt/ui', etc.

spaceTest.describe('my feature', { tag: tags.deploymentAgnostic }, () => {
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

## Global teardown hook (optional)

Use `globalTeardownHook` in `parallel_tests/global.teardown.ts` to reset Kibana/cluster state **once** after all workers finish — runs even if tests failed. Same fixture surface as setup, **except `esArchiver` is intentionally not exposed**.

```ts
import { globalTeardownHook } from '@kbn/scout'; // or '@kbn/scout-oblt' / '@kbn/scout-security'

globalTeardownHook('Reset shared Kibana state', async ({ esClient, kbnClient, apiServices, log }) => {
  log.info('[teardown] resetting shared state');

  // Drop hand-indexed data ingested by global.setup.ts that affects other Scout configs
  // sharing this cluster (Scout's esArchiver intentionally has no unload — see cautions)
  await esClient.indices.delete({ index: 'apm-8.0.0-*', ignore_unavailable: true });
  await esClient.indices.deleteDataStream({ name: 'logs-my_dataset-*' }).catch(() => {});

  // Revert any uiSettings / advanced settings the suite set globally
  await kbnClient.uiSettings.unset('discover:searchOnPageLoad');
  await kbnClient.uiSettings.updateGlobal({ hideAnnouncements: false });

  // Revert feature-flag overrides flipped via apiServices.core.settings(...)
  await apiServices.core.settings({ 'feature_flags.overrides': { 'discover.isEsqlDefault': 'false' } });

  // Saved-object cleanup the suite created cluster-wide (per-space cleanup belongs in afterAll)
  await kbnClient.savedObjects.cleanStandardList();
});
```

**Cautions:**

- **No `esArchiver` on the teardown surface — by design.** Scout's `esArchiver` fixture only ever exposed `loadIfNeeded`; archive-driven unloading was never supported because it's slow and adds nothing — leftover indexes in the cluster don't break tests when setup uses idempotent `loadIfNeeded`. For state that **does** need resetting, use `esClient.indices.delete` / `deleteDataStream` / `deleteByQuery` directly.
- **Don't reload data here** — teardown is for resetting state, not for setting up new data. If you need fresh data on every run, do it in `globalSetupHook` (which is idempotent via `esArchiver.loadIfNeeded`).
- **Per-test/per-suite cleanup still belongs in `afterEach`/`afterAll`** — the global teardown is for state shared across the whole suite (or leaked into the cluster from setup) that other configs running in the same Kibana/ES would otherwise inherit.
- **Available fixtures**: `log`, `config`, `kbnUrl`, `esClient`, `kbnClient`, `apiServices` (plus the same lazy `samlAuth`/`isSnapshotBuild` from `coreWorkerFixtures`). No `page`/`browserAuth`/`pageObjects` and no `esArchiver`.
- **Optional, opt-in by file presence**: just add `parallel_tests/global.teardown.ts` calling `globalTeardownHook(...)`. No new config flag — `runGlobalSetup: true` is enough.
