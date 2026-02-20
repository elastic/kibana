---
navigation_title: API services
---

# API services [scout-api-services]

API services are higher-level helpers for Kibana APIs used for **setup**, **teardown**, and **side-effect verification**. They’re accessed via the `apiServices` fixture (your editor should autocomplete `apiServices.<service>`).

::::::{tip}
API services should focus on **server-side interactions** (HTTP requests). UI interactions belong in [page objects](./page-objects.md).
::::::

## When to use `apiServices` vs `apiClient` [scout-api-services-when]

- **`apiClient`**: validate the endpoint under test with scoped credentials (see [Write API tests](./write-api-tests.md)).
- **`apiServices`**: prepare state, clean up, or verify side effects with higher privileges.

## Example [scout-api-services-example]

```ts
test.beforeAll(async ({ apiServices }) => {
  await apiServices.streams.enable();
});

test.afterAll(async ({ apiServices }) => {
  await apiServices.streams.disable();
});
```

## Create a new service [create-a-new-api-service]

If you find repeated API setup/cleanup code across suites, add a helper to your plugin/solution’s `apiServices` extension. If it’s broadly useful, consider contributing it to `@kbn/scout` or your solution Scout package.

## Extend `apiServices` in your plugin fixtures [extend-apiServices]

You can add plugin-specific helpers by extending the `apiServices` fixture in your `fixtures/index.ts`.

Example (API tests):

```ts
import type { ApiServicesFixture } from '@kbn/scout';
import { apiTest as baseApiTest } from '@kbn/scout';
import {
  getMyFeatureApiService,
  type MyFeatureApiService,
} from '../services/my_feature_api_service';

export interface MyFeatureApiServicesFixture extends ApiServicesFixture {
  myFeature: MyFeatureApiService;
}

export const apiTest = baseApiTest.extend<{ apiServices: MyFeatureApiServicesFixture }>({
  apiServices: async ({ apiServices, kbnClient, log }, use) => {
    const extendedApiServices = apiServices as MyFeatureApiServicesFixture;
    extendedApiServices.myFeature = getMyFeatureApiService({ kbnClient, log });
    await use(extendedApiServices);
  },
});
```

Use the helper for **setup/teardown** (and keep the endpoint under test in `apiClient` for readable, scoped tests). See [best practices](./best-practices.md#api-tests).
