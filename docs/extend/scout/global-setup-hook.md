---
navigation_title: Global setup hook
---

# Global setup hook [scout-global-setup-hook]

Use a global setup hook to run code **once** before any tests start (even with multiple workers). This is most useful for [parallel suites](./parallelism.md), where you want shared data/setup to exist before workers begin. It is also supported by non-parallel test suites.

**Common uses**:

- Load Elasticsearch archives with `esArchiver`
- Run one-time API setup with `apiServices`
- Apply shared Kibana settings via `kbnClient`

::::::{note}
Scout doesn’t currently have a global teardown hook. Most environments are ephemeral and are shut down after the run.
::::::

## Enable it [enable-global-setup-hook]

### 1. Turn it on in your config [global-setup-config]

Set `runGlobalSetup: true` in your Playwright config:

```ts
import { createPlaywrightConfig } from '@kbn/scout';

export default createPlaywrightConfig({
  testDir: './parallel_tests',
  workers: 2,
  runGlobalSetup: true,
});
```

### 2. Create `global.setup.ts` [global-setup-file]

Add `global.setup.ts` inside the `testDir` folder. Scout will discover and run it automatically.

```text
test/scout/ui/
└── parallel_tests/
    ├── global.setup.ts
    └── some_suite.spec.ts
```

### 3. Write setup code [global-setup-code]

Example: load an ES archive once:

```ts
import { globalSetupHook } from '@kbn/scout';

globalSetupHook('Load test data', async ({ esArchiver, log }) => {
  log.info('[setup] loading ES archive (only if needed)...');
  await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/ml/farequote');
});
```

::::::{warning}
The global setup hook only has access to **worker-scoped** fixtures. It cannot use test-scoped fixtures like `page`, `browserAuth`, or `pageObjects`.
::::::

## Run tests [global-setup-run-tests]

Run tests as usual via [Run Scout tests](./run-tests.md). The global setup hook will execute first—check console logs to verify it ran successfully.
