# Scout API Test Authentication (requestAuth vs samlAuth)

Use this when writing API tests with `apiTest`/`apiClient`, especially when validating RBAC.

## Pick an auth method

- `api/*` endpoints: use API keys via `requestAuth`.
- `internal/*` endpoints: use cookies via `samlAuth.asInteractiveUser(...)`.

Both methods return headers you spread into `apiClient` requests.

## API key auth (requestAuth)

- `requestAuth.getApiKey(roleName)`
- `requestAuth.getApiKeyForCustomRole(roleDescriptor)`

```ts
import type { RoleApiCredentials } from '@kbn/scout'; // or the module's Scout package (e.g. @kbn/scout-oblt)
import { apiTest, tags } from '@kbn/scout'; // or the module's Scout package
import { expect } from '@kbn/scout/api'; // or '@kbn/scout-oblt/api', etc.

const COMMON_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '2023-10-31', // include for versioned public APIs
};

apiTest.describe('GET /api/my_plugin/foo', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  let viewer: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    viewer = await requestAuth.getApiKey('viewer');
  });

  apiTest('works', async ({ apiClient }) => {
    const response = await apiClient.get('api/my_plugin/foo', {
      headers: { ...COMMON_HEADERS, ...viewer.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual(expect.objectContaining({ id: expect.any(String) }));
  });
});
```

## Cookie auth (samlAuth) for internal endpoints

```ts
import { apiTest, tags } from '@kbn/scout'; // or the module's Scout package
import { expect } from '@kbn/scout/api'; // or '@kbn/scout-oblt/api', etc.

const INTERNAL_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
};

apiTest.describe('GET /internal/my_plugin/foo', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  apiTest('calls internal endpoint', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

    const response = await apiClient.get('internal/my_plugin/foo', {
      headers: { ...INTERNAL_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
  });
});
```

## API assertions (`@kbn/scout/api`)

Import `expect` from `@kbn/scout/api` (or `@kbn/scout-<solution>/api`). It provides custom matchers on top of standard ones:

- `expect(response).toHaveStatusCode(200)` — assert HTTP status code.
- `expect(response).toHaveStatusText('OK')` — assert HTTP status text.
- `expect(response).toHaveHeaders({ 'content-type': 'application/json' })` — assert response headers.
- Standard matchers like `toBe`, `toStrictEqual`, `toBeDefined`, `toMatchObject` are also available.
- Asymmetric matchers: `expect.objectContaining(...)`, `expect.any(String)`, `expect.toBeGreaterThan(0)`, etc.

`apiClient` methods (`get`, `post`, `put`, `delete`, `patch`, `head`) return `{ statusCode, body, headers }`.

## Tips

- Generate credentials in `beforeAll` if reused across tests.
- Prefer custom roles for permission-boundary tests instead of `admin`.
