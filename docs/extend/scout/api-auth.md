---
navigation_title: API auth
---

# Authentication in Scout API tests [scout-api-auth]

Scout supports two authentication methods for API tests:

- API key-based authentication using the `requestAuth` fixture
- Cookie-based authentication using an interactive user session from the `samlAuth` fixture

Choosing the right type depends on how the endpoint is normally accessed. Both methods support built-in and custom roles, and both return headers you can pass to `apiClient` (`apiKeyHeader` or `cookieHeader`).

## Choose an authentication type [choose-auth-type]

| Use case | Endpoint prefix | Auth method | Why |
| --- | --- | --- | --- |
| Public, documented Kibana APIs | Starts with `api/*` | API key | Designed for programmatic access |
| Internal Kibana APIs | Starts with `internal/*` | Cookie-based | Best simulates how the Kibana UI calls internal APIs |

Public APIs reference: `https://www.elastic.co/docs/api/doc/kibana`

## Predefined roles vs custom roles [predefined-vs-custom-roles]

- **Predefined roles** are built-in roles like `admin`, `editor`, `viewer`.
- **Custom roles** are roles you define for tests with specific Kibana/Elasticsearch privileges.

## API key authentication [api-key-auth]

Use API keys to authorize requests to public Kibana APIs.

### Create an API key [create-api-key]

`requestAuth` is a worker-scoped fixture that generates API keys for authenticating requests.

Common methods:

| Method | Description |
| --- | --- |
| `requestAuth.getApiKey(role)` | API key for a predefined role (`admin`, `viewer`, `editor`, …) |
| `requestAuth.getApiKeyForAdmin()` | Shorthand for `getApiKey('admin')` |
| `requestAuth.getApiKeyForViewer()` | Shorthand for `getApiKey('viewer')` |
| `requestAuth.getApiKeyForPrivilegedUser()` | Non-admin elevated role (resolved by environment) |
| `requestAuth.getApiKeyForCustomRole(roleDescriptor)` | API key for a custom role descriptor |

These methods return a `RoleApiCredentials` object with `apiKeyHeader` ready to spread into request headers.

**Basic usage example:**

```ts
import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

const COMMON_HEADERS = { <1>
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
};

apiTest.describe('GET /api/console/api_server', { tag: tags.deploymentAgnostic }, () => {
  let viewerApiCredentials: RoleApiCredentials; <2>

  apiTest.beforeAll(async ({ requestAuth }) => {
    viewerApiCredentials = await requestAuth.getApiKeyForViewer(); <3>
  });

  apiTest('returns autocomplete definitions', async ({ apiClient }) => {
    const { body, statusCode } = await apiClient.get('api/console/api_server', {
      headers: {
        ...COMMON_HEADERS,
        ...viewerApiCredentials.apiKeyHeader, <4>
      },
      responseType: 'json',
    });

    expect(statusCode).toBe(200);
    expect(body).toMatchObject({
      es: {
        endpoints: expect.any(Object),
        globals: expect.any(Object),
        name: 'es',
      },
    });
  });
});
```

1. `kbn-xsrf` is required for state-changing requests (POST/PUT/DELETE). `x-elastic-internal-origin` identifies the request as coming from Kibana internals.
2. Store credentials in `beforeAll` for reuse.
3. Generate an API key for `viewer`.
4. Spread `apiKeyHeader` to authenticate the request.

### Authenticating with a custom role [api-key-custom-role]

Use `getApiKeyForCustomRole()` to test permission boundaries and avoid `admin` where possible.

Example custom Kibana+Elasticsearch role descriptor:

```ts
const credentials = await requestAuth.getApiKeyForCustomRole({
  elasticsearch: {
    cluster: ['cluster:admin/scripts/painless/execute'],
  },
  kibana: [
    {
      base: [],
      feature: { dev_tools: ['all'] },
      spaces: ['*'],
    },
  ],
});
```

## Cookie-based authentication [cookie-auth]

Use cookies to authorize requests to internal Kibana endpoints. In Kibana’s SAML-based setup, the cookie represents an interactive user session.

| Method | Description |
| --- | --- |
| `samlAuth.asInteractiveUser(roleOrDescriptor)` | Returns session cookies for a predefined role or custom privileges |

Example with a built-in role:

```ts
apiTest('calls an internal endpoint as an interactive user', async ({ apiClient, samlAuth }) => {
  const { cookieHeader } = await samlAuth.asInteractiveUser('viewer'); <1>

  const response = await apiClient.get('internal/some/endpoint', {
    headers: {
      'kbn-xsrf': 'some-xsrf-token',
      'x-elastic-internal-origin': 'kibana',
      ...cookieHeader,
    },
    responseType: 'json',
  });

  expect(response.statusCode).toBe(200);
});
```

1. `cookieHeader` contains a ready-to-use `Cookie` header for authentication.

## Best practices [best-practices]

- Use API keys for `api/*` endpoints and cookies for `internal/*` endpoints.
- Avoid `admin` unless absolutely necessary; prefer custom minimal roles.
- Generate credentials once in `beforeAll` when reused across tests.
- Keep custom roles minimal (least privilege).
- Always include required headers (`kbn-xsrf`, `x-elastic-internal-origin`) where applicable.

