# API Services

API services interact with Kibana APIs to set up the right environment for your tests. All individual API services are accessed through a central `apiServices` fixture. When you type `apiServices.` (notice the dot), you should be able to see all the available API services thanks to your editor's autocompletion feature.

> **Warning:** API services should focus exclusively on **server-side interactions** (e.g., making HTTP requests). They should **not** interact with the UI (look into `page objects` or `fixtures` instead).

---

## A real-world example

Let's take a look at a real-world example. Tests for the Streams feature use the `streams` API service to enable and disable the feature in `beforeAll` and `afterAll` hooks:

```ts
import { expect } from '@kbn/scout';
import { test } from '../../../fixtures';
import { DATE_RANGE, generateLogsData } from '../../../fixtures/generators';

test.describe(
  'Stream data processing - data sources management',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      // 1. We unpack the `apiServices` fixture here.
      await apiServices.streams.enable(); // 2. We access the `streams` API service to enable streams.
      await generateLogsData(logsSynthtraceEsClient)({ index: 'logs-generic-default' });
    });

    // ...

    test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
      await apiServices.streams.disable(); // 3. We disable streams with another API call.
    });

    test('should load by default a random samples data source', async ({ pageObjects }) => {
      // ...
    });

    // ...
  }
);
```

---

## Create a new API service

You can extend the `apiServices` fixture to include a new service. For example, if we create a new service called `fleet`, you'll then be able to access it by using `apiServices.fleet` in your tests.

1.  Create a new file in a new folder (e.g., `fleet`) within the main API fixtures directory. For example:

    ```ts
    export interface FleetApiService {
      integration: {
        install: (name: string) => Promise<void>;
        delete: (name: string) => Promise<void>;
      };
    }

    export const getFleetApiHelper = (log: ScoutLogger, kbnClient: KbnClient): FleetApiService => {
      return {
        integration: {
          install: async (name: string) => {
            // implementation
            // ...
          },
          delete: async (name: string) => {
            // implementation
            // ...
          },
        },
      };
    };
    ```

2.  **Register the API service** by updating the main index file for the API fixtures to include the new service:

    ```ts
    export const apiServicesFixture = coreWorkerFixtures.extend<
      {},
      { apiServices: ApiServicesFixture }
    >({
      apiServices: [
        async ({ kbnClient, log }, use) => {
          const services = {
            // add new service
            fleet: getFleetApiHelper(log, kbnClient),
          };
          // ...
      ],
    });
    ```

3.  **Use the service** in your tests. For example:

    ```ts
    test('should install an integration via API', async ({ apiServices }) => {
      // You can now access `apiServices.fleet` from any test.
      await apiServices.fleet.integration.install('nginx');
      // ... rest of the test logic
    });
    ```
