---
navigation_title: Fixtures
---

# Fixtures [scout-fixtures]

Fixtures offer essential context to your tests. The `@kbn/scout` package includes fixtures specifically designed for Scout tests. These fixtures provide reusable, scoped resources so tests have consistent and isolated access to critical services such as logging, configuration, and Kibana and Elasticsearch clients.

## Usage [scout-fixtures-usage]

Fixtures are similar to **FTR services**. They can help tests with authentication and parallelization, and provide access to the Elasticsearch client, ES archiver, Kibana APIs, and more.

```ts
test.describe('My test suite', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeAll(async ({ kbnClient }) => { <1>
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.ECOMMERCE);
  });

  test.beforeEach(async ({ browserAuth }) => { <2>
    await browserAuth.loginAsViewer();
  });

  // ...
});
```

1. `kbnClient` is a fixture from `@kbn/scout` that provides access to the Kibana client.
2. `browserAuth` is also a fixture from `@kbn/scout`.

## Fixture scope [scout-fixtures-scope]

Fixtures can be scoped either to the **test** or the **worker**. The scope decides when a new fixture instance is initialized.

- **Worker-scoped** fixtures live as long as the worker lives.
- **Test-scoped** fixtures are initialized for each test.

Choose the correct scope for optimal runtime: if a new instance is not needed for every test, the fixture should be worker-scoped.

Worker-scoped fixtures live as long as the worker lives. If a test fails, Playwright [shuts down](https://playwright.dev/docs/test-parallel#worker-processes) the workers to guarantee a pristine environment for the following tests.

## Core Scout fixtures [core-scout-fixtures]

Here are the fixtures provided by `@kbn/scout` (and by solution-specific Scout packages).

| Scout worker-scoped fixtures |  |
| --- | --- |
| `apiClient` | A [supertest](https://github.com/forwardemail/supertest) wrapper for making HTTP requests. |
| `apiServices` | An extendable group of API helpers that interact with servers. |
| `config` | Access to the test servers configuration. |
| `esArchiver` | Utility for loading Elasticsearch data archives. |
| `esClient` | An Elasticsearch client instance for interacting with the cluster. |
| `kbnClient` | A Kibana client for making HTTP requests to the Kibana server. |
| `requestAuth` | Utility for retrieving an API key for a specified role using SAML authentication. Learn more about [API authentication](./api-auth.md). |
| `log` | A logger instance for use within fixtures and tests. |
| `samlAuth` | Utility for generating and handling SAML authentication flows in Kibana. |

| Scout test-scoped fixtures |  |
| --- | --- |
| `browserAuth` | Enables Kibana login by setting authentication cookies directly in the browser context. Learn more about [browser authentication](./browser-auth.md). |
| `pageObjects` | Provides access to the registered [page objects](./page-objects.md). |
| `page` | [Built-in Playwright fixture](https://playwright.dev/docs/api/class-page) that Scout extends with some additional methods. |

:::::{warning}
Some fixtures are only available in **UI** tests (for example, browser-related fixtures), whereas others are only available in **API** tests (for example, `apiClient` and `requestAuth`).
:::::

## Create a new fixture [create-a-new-fixture]

To create a new fixture, create a folder called `fixtures` inside one of these folders (if the directory doesn't exist already):

- `<your_plugin_root>/test/scout/ui` (UI test fixtures)
- `<your_plugin_root>/test/scout/api` (API test fixtures)
- `<your_plugin_root>/test/scout/common` (shared between UI and API tests)

Then, depending on whether the fixture is scoped to the test or the worker, create a `test` or `worker` folder.

:::::{warning}
If a fixture or page object could be effectively reused across multiple solutions, consider contributing it to either `@kbn/scout` or `@kbn/scout-<solution>` instead. Platform plugins should contribute to `@kbn/scout`.
:::::

## Extending core Scout fixtures [extending-core-scout-fixtures]

Scout provides a predefined set of “core” fixtures that cover common test needs. In most cases, the goal isn't to create entirely new fixtures, but rather to extend existing fixtures with additional functionality.

When extending core fixtures, extend the correct set of fixtures based on whether your tests are sequential or parallel.

| Fixture class | |
| --- | --- |
| `ScoutTestFixtures` | Test-scoped fixtures for **sequential tests**. |
| `ScoutWorkerFixtures` | Worker-scoped fixtures for **sequential tests**. |
| `ScoutParallelTestFixtures` | Test-scoped fixtures for **parallel tests**. |
| `ScoutParallelWorkerFixtures` | Worker-scoped fixtures for **parallel tests**. |

:::::{warning}
If your new fixture is solution-specific, extend the corresponding solution-specific fixture class (for example, `SecurityWorkerFixtures` or `ObltTestFixtures`).

If your fixture is generic and could be reused across multiple solutions, extend the core Scout fixture class (for example, `ScoutTestFixtures` or `ScoutWorkerFixtures`).
:::::

## Extend Scout core worker fixtures (example) [extend-worker-fixtures-example]

In this example, we'll define a worker-scoped fixture that creates a Kibana user. The fixture takes in a list of roles and returns a username and password.

Create a `users` folder in `src/platform/packages/shared/kbn-scout/src/playwright/fixtures/worker`, and then create a file called `index.ts`:

```ts
import { coreWorkerFixtures } from '../core_fixtures';

export interface KibanaUserFixture {
  create(roles: string[]): Promise<{ username: string; password: string }>;
}

export const kibanaUserFixture = coreWorkerFixtures.extend<{}, { kibanaUser: KibanaUserFixture }>({ <1>
  kibanaUser: [
    async ({ kbnClient }, use) => {
      const create = async (roles: string[]) => { <2>
        const username = 'test_user';
        const password = 'test_password';

        await kbnClient.request({
          path: `/internal/security/users/${username}`,
          method: 'PUT',
          body: {
            password,
            roles,
            full_name: 'Test User',
            email: 'test_user@example.com',
          },
        });

        return { username, password };
      };

      await use({ create });
    },
    { scope: 'worker' },
  ],
});
```

1. Extend `coreWorkerFixtures` so you have access to `kbnClient` in your fixture.
2. You will call this function as `kibanaUser.create(...)` in your tests.

Export the fixture in `src/platform/packages/shared/kbn-scout/src/playwright/fixtures/worker/index.ts`:

```ts
// ...

export { kibanaUserFixture } from './user';
export type { KibanaUserFixture } from './user';
```

Import the fixture in `src/platform/packages/shared/kbn-scout/src/playwright/fixtures/single_thread_fixtures.ts`:

```ts
import {
  apiServicesFixture,
  coreWorkerFixtures,
  esArchiverFixture,
  uiSettingsFixture,
  synthtraceFixture,
  lighthouseFixture,
  kibanaUserFixture, // new
} from './worker';
import type {
  ApiServicesFixture,
  EsArchiverFixture,
  EsClient,
  KbnClient,
  KibanaUrl,
  ScoutLogger,
  ScoutTestConfig,
  UiSettingsFixture,
  SynthtraceFixture,
  KibanaUserFixture, // new
} from './worker';
```

Add the fixture to `mergeTests`, which combines all the fixtures together:

```ts
export const scoutFixtures = mergeTests(
  // worker scope fixtures
  coreWorkerFixtures,
  esArchiverFixture,
  uiSettingsFixture,
  synthtraceFixture,
  kibanaUserFixture, // new
  // api fixtures
  apiServicesFixture,
  // test scope fixtures
  browserAuthFixture,
  scoutPageFixture,
  pageObjectsFixture,
  validateTagsFixture,
  // performance fixtures
  perfTrackerFixture
);

// ...

export interface ScoutWorkerFixtures extends ApiServicesFixture {
  log: ScoutLogger;
  config: ScoutTestConfig;
  kbnUrl: KibanaUrl;
  kbnClient: KbnClient;
  esClient: EsClient;
  esArchiver: EsArchiverFixture;
  uiSettings: UiSettingsFixture;
  apiServices: ApiServicesFixture;
  apmSynthtraceEsClient: SynthtraceFixture['apmSynthtraceEsClient'];
  infraSynthtraceEsClient: SynthtraceFixture['infraSynthtraceEsClient'];
  otelSynthtraceEsClient: SynthtraceFixture['otelSynthtraceEsClient'];
  kibanaUser: KibanaUserFixture; // new
}
```

You can now access your fixture in all single-threaded tests:

```ts
test.describe('sample test suite', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient, uiSettings, kibanaUser }) => {
    await kibanaUser.create(['role-1']);
  });

  // ...
});
```

