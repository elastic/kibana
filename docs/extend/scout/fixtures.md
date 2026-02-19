---
navigation_title: Fixtures
---

# Fixtures [scout-fixtures]

Fixtures are Scout’s reusable building blocks for authentication, clients, data setup, and shared helpers. They’re similar in spirit to FTR services, but follow Playwright’s fixture model.

## Quick usage [scout-fixtures-usage]

```ts
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

Use worker scope for expensive setup when tests can safely share it.

## Core Scout fixtures [core-scout-fixtures]

These are provided by `@kbn/scout` and are also available when using solution Scout packages.

| Worker-scoped | What it’s for                                              |
| ------------- | ---------------------------------------------------------- |
| `apiClient`   | Supertest-based HTTP client for endpoint validation        |
| `apiServices` | Higher-level API helpers (setup/teardown/verification)     |
| `config`      | Test server configuration                                  |
| `esArchiver`  | Load ES archives                                           |
| `esClient`    | Elasticsearch client                                       |
| `kbnClient`   | Kibana API client                                          |
| `requestAuth` | Role-scoped API key helper (see [API auth](./api-auth.md)) |
| `log`         | Logger for fixtures and tests                              |
| `samlAuth`    | SAML auth helper for interactive sessions (API tests)      |

| Test-scoped   | What it’s for                                                     |
| ------------- | ----------------------------------------------------------------- |
| `browserAuth` | Browser login via cookies (see [Browser auth](./browser-auth.md)) |
| `pageObjects` | Registered [page objects](./page-objects.md)                      |
| `page`        | Playwright `Page` extended by Scout helpers                       |

::::::{note}
Availability varies by test type (UI vs API). When in doubt, rely on editor autocomplete for the fixture list available in your test.
::::::

## Create plugin/solution fixtures [create-a-new-fixture]

Add fixtures under your test tree:

- UI fixtures: `<plugin-root>/test/scout/ui/fixtures`
- API fixtures: `<plugin-root>/test/scout/api/fixtures`
- Shared: `<plugin-root>/test/scout/common/fixtures`

Typically you’ll create a `fixtures/index.ts` entry point that **extends** Scout’s base `test` (UI) and/or `apiTest` (API), then import that in your spec files:

```ts
// UI test spec: <plugin-root>/test/scout/ui/tests/my_suite.spec.ts
import { test } from '../fixtures';

test('uses plugin fixtures', async ({ pageObjects }) => {
  // ...
});
```

If a fixture would be broadly useful, consider contributing it to `@kbn/scout` (platform-wide) or your solution Scout package.
