---
navigation_title: Fixtures
---

# Fixtures [scout-fixtures]

Fixtures are Scout’s reusable building blocks for authentication, clients, data setup, and shared helpers. They’re similar in spirit to FTR services, but follow Playwright’s fixture model.

## Quick usage [scout-fixtures-usage]

`kbnClient` and `browserAuth` are some popular fixtures:

```ts
import { tags } from '@kbn/scout';
import { test } from '../fixtures';

test.describe('My suite', { tag: tags.deploymentAgnostic }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.importExport.load('path/to/archive');
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });
});
```

## Fixture scope [scout-fixtures-scope]

- **Worker-scoped** fixtures live for the lifetime of a Playwright worker.
- **Test-scoped** fixtures are created per test.

### Performance implications [scout-fixtures-scope-performance]

Fixture scope is a trade-off between **speed** and **isolation**:

- **Test-scoped** fixtures run once per test. This is the safest default (no shared mutable state), but it can be slower if the fixture does real work each time (logins, data creation, ingest, large API calls).
- **Worker-scoped** fixtures run once per worker and are reused across tests in that worker. This can significantly speed up suites by avoiding repeated setup, but you must ensure tests don’t leak state through the shared fixture.

Rules of thumb:

- **Use test scope** for anything that represents a *per-test session* or *mutable state* (for example UI `page`/`context`, `browserAuth`, or helpers that change server data as part of the test).
- **Use worker scope** for expensive, reusable clients and helpers (for example `kbnClient`, `esClient`, `apiServices`) and for setup that’s safe to share within a worker.
- If you need to run something **once before any workers start** (for example shared data ingestion for parallel suites), use a [global setup hook](./global-setup-hook.md) instead of a worker-scoped fixture.

## Core Scout fixtures [core-scout-fixtures]

Scout exposes different fixture sets depending on the entrypoint you import.

### UI tests (`test`) [scout-fixtures-test]

- **Worker-scoped**: `log`, `config`, `kbnUrl`, `kbnClient`, `esClient`, `esArchiver`, `uiSettings`, `apiServices`, `samlAuth` (plus optional synthtrace clients)
- **Test-scoped**: `browserAuth`, `page` (Scout-extended), `pageObjects`, `perfTracker`

### Parallel UI tests (`spaceTest`) [scout-fixtures-spaceTest]

- **Worker-scoped**: `log`, `config`, `kbnUrl`, `kbnClient`, `esClient`, `apiServices`, `samlAuth`, `scoutSpace` (one Space per worker)
- **Test-scoped**: `browserAuth`, `page` (Scout-extended), `pageObjects`

### API tests (`apiTest`) [scout-fixtures-apiTest]

- **Worker-scoped**: `log`, `config`, `kbnUrl`, `kbnClient`, `esClient`, `esArchiver`, `apiClient`, `apiServices`, `samlAuth`, `requestAuth`
- **Test-scoped**: browser fixtures like `page`/`context` are disabled (API tests are HTTP-only)

::::::{note}
Availability varies by test type (UI vs API). When in doubt, rely on editor autocomplete for the fixture list available in your test.
::::::

## Create plugin/solution fixtures [create-a-new-fixture]

:::::::::::{stepper}

::::::::::{step} Add fixture folders

Add fixtures under your test tree:

- UI fixtures: `<plugin-root>/test/scout/ui/fixtures`
- API fixtures: `<plugin-root>/test/scout/api/fixtures`
- Shared: `<plugin-root>/test/scout/common/fixtures`

::::::::::

::::::::::{step} Create a `fixtures/index.ts` entry point

Typically you’ll create a `fixtures/index.ts` entry point that **extends** Scout’s base `test` (UI) and/or `apiTest` (API), then import that in your spec files:

```ts
// UI test spec: <plugin-root>/test/scout/ui/tests/my_suite.spec.ts
import { tags } from '@kbn/scout';
import { test } from '../fixtures';

test('uses plugin fixtures', { tag: tags.deploymentAgnostic }, async ({ pageObjects }) => {
  // ...
});
```

::::::::::

::::::::::{step} Contribute when broadly useful

If a fixture would be broadly useful, consider contributing it to `@kbn/scout` (platform-wide) or your solution Scout package.

::::::::::

:::::::::::
