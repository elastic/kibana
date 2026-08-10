---
navigation_title: Best practices
---

# Best practices for Scout API tests [scout-api-best-practices]

Best practices specific to Scout **API tests**.

:::::{tip}
For guidance that applies to both UI and API tests, see the [general Scout best practices](./scout-best-practices.md). Scout is built on Playwright, so the official [Playwright Best Practices](https://playwright.dev/docs/best-practices) also apply.
:::::

## Validate endpoints with `apiClient` [validate-endpoints-with-apiclient-for-readable-and-scoped-tests]

Use the right fixture for the right purpose:

| Fixture                       | Use for                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `apiClient`                   | The endpoint under test (with scoped credentials from [API auth](./api-auth.md)) |
| `apiServices`                 | Setup/teardown and side effects                                                  |
| `kbnClient`, `esClient`, etc. | Lower-level setup when `apiServices` doesn’t have a suitable helper              |

Prefer tests that read like “call endpoint X as role Y, assert outcome”.

:::::{dropdown} Example

```ts
import { expect } from '@kbn/scout/api';

apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
  await apiServices.myFeature.createTestData();
  viewerCredentials = await requestAuth.getApiKeyForViewer();
});

apiTest('returns data for viewer', async ({ apiClient }) => {
  const response = await apiClient.get('api/my-feature/data', {
    headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
  });

  expect(response).toHaveStatusCode(200);
  expect(response.body.items).toHaveLength(3);
});
```

:::::

This pattern validates both endpoint behavior and the [permission model](./scout-best-practices.md#test-with-minimal-permissions-avoid-admin-when-possible).

## Choose the right auth pattern [choose-the-right-auth-pattern]

Scout supports two authentication methods for API tests. Choose based on endpoint type:

| Endpoint type                | Auth method          | Fixture                        |
| ---------------------------- | -------------------- | ------------------------------ |
| Public APIs (`api/*`)        | API key              | `requestAuth` + `apiKeyHeader` |
| Internal APIs (`internal/*`) | Cookie-based session | `samlAuth` + `cookieHeader`    |

See [API authentication](./api-auth.md) for details and examples.

## Validate the response body (not just status) [dont-just-verify-the-status-code-validate-the-response-body]

Status code assertions are necessary but not sufficient. Also validate shape and key fields.

:::::{dropdown} Examples
❌ **Don’t:** assert only the status code:

```ts
apiTest('returns autocomplete definitions', async ({ apiClient }) => {
  const response = await apiClient.get('api/console/api_server', {
    headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
  });

  expect(response).toHaveStatusCode(200);
});
```

✔️ **Do:** validate shape and key fields too:

```ts
apiTest('returns autocomplete definitions', async ({ apiClient }) => {
  const response = await apiClient.get('api/console/api_server', {
    headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
  });

  expect(response).toHaveStatusCode(200);
  expect(response.body).toMatchObject({
    es: {
      endpoints: expect.any(Object),
      globals: expect.any(Object),
      name: 'es',
    },
  });
});
```

:::::

## Wait for async backend work instead of raising the test timeout [wait-for-async-backend-work]

When an endpoint kicks off asynchronous work (a rollup, a task-manager run, an index refresh), resist raising `apiTest.setTimeout` until the slowest run you happened to observe fits. A multi-minute timeout hides how long the operation really takes, turns every failure into an uninformative timeout, and is calibrated to whichever environment you measured — a budget tuned against a local stack will still blow on Cloud, where the same poll crosses a real network.

Use `expect.poll` instead. It re-runs the callback until the assertion passes or its own deadline expires, so the test finishes as soon as the work completes and reports the last observed value when it doesn't.

:::::{dropdown} Examples
❌ **Don't:** stretch the whole test's timeout to cover a slow poll:

```ts
apiTest('creates an SLO and rolls up data', async ({ apiClient }) => {
  apiTest.setTimeout(330_000);
  // ...
});
```

✔️ **Do:** poll for the condition you're waiting on, with a bounded deadline:

```ts
await expect
  .poll(
    async () => {
      const response = await apiClient.get(sloPath, { headers });
      return response.body.summary.status;
    },
    { timeout: 60_000, intervals: [2_000] }
  )
  .toBe('HEALTHY');
```

:::::

Two constraints worth knowing:

- Return the value you want to assert on from the callback. Inside `expect.poll`, only the generic matchers are available (`toBe`, `toMatchObject`, and so on) — not response matchers like `toHaveStatusCode`.
- `expect(...).toPass()` is **not** available in Scout API tests; `expect.poll` is the supported equivalent.

If an operation genuinely needs minutes, add a comment next to the override explaining why, and consider whether the scenario belongs in a Jest integration test where the backend can be driven directly.

## Related guides

- [General best practices](./scout-best-practices.md) — apply to both UI and API tests
- [Write API tests](./write-api-tests.md)
- [API authentication](./api-auth.md)
- [API services](./api-services.md)
- [Parallelism notes for API tests](./parallelism.md#api-tests-and-parallelism)
