---
navigation_title: API services
---

# API services [scout-api-services]

API services are higher-level helpers for Kibana APIs used for **setup**, **teardown**, and **side-effect verification**. They’re accessed via the `apiServices` fixture (your editor should autocomplete `apiServices.<service>`).

::::::{warning}
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

