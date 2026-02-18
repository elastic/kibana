---
navigation_title: Write API tests
---

# Write Scout API tests [scout-write-api-tests]

This guide walks through a real-world Scout API test and recommended patterns.

:::::{warning}
We assume you have [set up your plugin or package](./setup-plugin.md) to work with Scout.
:::::

## API test suite anatomy [api-test-suite-anatomy]

Scout provides fixtures that work together to create realistic, well-scoped API tests:

| Fixture | Purpose | Use for |
| --- | --- | --- |
| `requestAuth` | Create scoped credentials | Getting API keys with specific permissions |
| `apiClient` | Make HTTP requests | Testing the endpoint using the credentials you provide |
| `apiServices` | Higher-level API helpers | Setup/teardown/verifying changes (runs with superuser-like privileges; serverless includes operator privileges) |
| `kbnClient` | Lower-level API helpers | Setup/teardown/verification via namespaced clients (saved objects, spaces, ui settings, import/export, …) |
| `esClient` | Elasticsearch client | Direct ES operations (indices, docs, mappings) |
| `esArchiver` | ES data loader | Pre-populate ES with test datasets |

:::::{warning}
Fixture availability differs by test type. For the core list, see [Fixtures](./fixtures.md#core-scout-fixtures).
:::::

**Recommended pattern**:

1. **Prepare**: use `apiServices`, `kbnClient`, `esArchiver`, etc. to set up your environment.
2. **Authenticate**: use `requestAuth` to create role-scoped credentials.
3. **Send the request**: use `apiClient` with those credentials to test your endpoint.
4. **Assert**: validate status code and body; verify side effects with `apiServices` / `kbnClient` if needed.

## A real-world example [api-test-example]

Example (Console plugin):

- `https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/console/test/scout/api/tests/spec_definitions.spec.ts`

```ts
import type { RoleApiCredentials } from '@kbn/scout'; <1>
import { apiTest, tags } from '@kbn/scout'; <1>
import { expect } from '@kbn/scout/api'; <1>

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};

apiTest.describe(
  'GET /api/console/api_server',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.security.complete,
      ...tags.serverless.observability.complete,
      ...tags.serverless.search,
    ],
  },
  () => {
    let viewerApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      viewerApiCredentials = await requestAuth.getApiKeyForViewer(); <2>
    });

    apiTest('returns autocomplete definitions', async ({ apiClient }) => {
      const { body, statusCode } = await apiClient.get('api/console/api_server', { <3>
        headers: {
          ...COMMON_HEADERS,
          ...viewerApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(200); <4>
      expect(body).toMatchObject({
        es: {
          endpoints: expect.any(Object),
          globals: expect.any(Object),
          name: 'es',
        },
      });
    });
  }
);
```

1. Import from `@kbn/scout` (or a solution-specific Scout package).
2. Request an API key for the `viewer` role in `beforeAll`.
3. Send a request to the endpoint under test using `apiClient`.
4. Assert status code and response body structure.

## Save the test file [save-api-test-file]

API tests should be saved under `<plugin-root>/test/scout/api/tests` and file names must end with `.spec.ts`.

## Next steps [api-tests-next]

- [API authentication](./api-auth.md)
- [Create a fixture](./fixtures.md#create-a-new-fixture)
- [Run tests](./run-tests.md) and [debugging](./debugging.md)
- [Parallelism notes](./parallelism.md#api-tests-and-parallelism)

