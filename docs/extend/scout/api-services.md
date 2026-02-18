---
navigation_title: API services
---

# API services [scout-api-services]

API services interact with Kibana APIs to set up the right environment for your tests. Individual API services are accessed through the central `apiServices` fixture. When you type `apiServices.` (notice the dot), your editor should autocomplete available services.

:::::{warning}
API services should focus exclusively on **server-side interactions** (making HTTP requests). They should **not** interact with the UI. Use [page objects](./page-objects.md) or [fixtures](./fixtures.md) for UI interactions.
:::::

## A real-world example [scout-api-services-example]

Streams tests use the `streams` API service to enable and disable the feature in `beforeAll` and `afterAll` hooks:

```ts
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../../fixtures';
import { DATE_RANGE, generateLogsData } from '../../../fixtures/generators';

test.describe(
  'Stream data processing - data sources management',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ apiServices, logsSynthtraceEsClient }) => { <1>
      await apiServices.streams.enable(); <2>
      await generateLogsData(logsSynthtraceEsClient)({ index: 'logs-generic-default' });
    });

    // ...

    test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
      await apiServices.streams.disable(); <3>
    });

    test('should load by default a random samples data source', async ({ pageObjects }) => {
      // ...
    });

    // ...
  }
);
```

1. Unpack the `apiServices` fixture.
2. Use the `streams` API service to enable Streams for the suite.
3. Disable Streams with another API call.

For reference, this example is taken from `streams_app` tests in the repository:

- `https://github.com/elastic/kibana/blob/97f2fd32a409fb20207eef2e893e253045d5f354/x-pack/platform/plugins/shared/streams_app/test/scout/ui/tests/data_management/data_processing/data_sources_management.spec.ts#L20-L36`

## Create a new API service [create-a-new-api-service]

To add a new API service, extend the `apiServices` fixture so you can access it as `apiServices.<serviceName>` in tests.

### 1. Create the service helper [create-api-helper]

Create a new file (for example, a `fleet` folder) in the API helpers directory:

- `<scout_package>/src/playwright/fixtures/scope/worker/apis`

Example:

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
      },
      delete: async (name: string) => {
        // implementation
      },
    },
  };
};
```

### 2. Register the service [register-api-service]

Update the API helpers index (for example, `<scout_package>/src/playwright/fixtures/scope/worker/apis/index.ts`) to include the new service:

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
    },
  ],
});
```

### 3. Use the service in tests [use-api-service]

```ts
test('should install an integration via API', async ({ apiServices }) => {
  await apiServices.fleet.integration.install('nginx'); <1>
  // ... rest of the test logic
});
```

1. You can now access `apiServices.fleet` from any test that includes the `apiServices` fixture.

