---
navigation_title: Parallelism
---

# Parallelism [scout-parallelism]

Scout supports parallel execution using Playwright workers. Parallel runs are usually faster, but they require good isolation and predictable setup.

::::::{note}
Parallelism happens at the **file** level: Playwright runs test files in parallel workers. Tests in the same file still run in order.
::::::

## How it works [scout-parallelism-how]

- All workers share the same Kibana + Elasticsearch deployment.
- Each worker gets an isolated Kibana space via the `scoutSpace` fixture (used with `spaceTest`).
- The space is cleaned up when the worker finishes.

## When to use parallel vs sequential [scout-parallelism-differences]

- **Parallel**: UI suites that can share pre-ingested data and isolate state per space.
- **Sequential**: suites that require a “clean” cluster state or need global mutations that aren’t space-scoped.

## Enable parallel UI suites [enable-parallel-tests]

### 1. Create a parallel config [parallel-config-workers]

Add a config that points at a `parallel_tests/` directory and sets `workers`:

```ts
import { createPlaywrightConfig } from '@kbn/scout';

export default createPlaywrightConfig({
  testDir: './parallel_tests',
  workers: 2,
  runGlobalSetup: true,
});
```

### 2. Pre-ingest shared data (recommended) [parallel-global-setup]

Use a [global setup hook](./global-setup-hook.md) to load shared data once before workers start.

### 3. Use `spaceTest` [parallel-spaceTest]

Use `spaceTest` to access `scoutSpace`:

```ts
import { spaceTest, tags } from '@kbn/scout';

spaceTest.describe('My parallel suite', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    // space-scoped setup (saved objects, ui settings, ...)
  });

  spaceTest('does something', async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsViewer();
    // ...
  });
});
```

## API tests and parallelism [api-tests-and-parallelism]

Parallel execution for API tests is not currently supported.

## Parallel best practices [scout-parallelism-best-practices]

- Load shared ES data once (global setup) and avoid mutating it in tests.
- Clean up space-scoped changes (saved objects / UI settings) in `afterAll`.
- If a suite can’t be isolated, keep it sequential.
