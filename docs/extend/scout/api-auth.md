---
navigation_title: API auth
---

# Authentication in Scout API tests [scout-api-auth]

Scout supports two ways to authenticate API tests:

- **API keys** via the `requestAuth` fixture (best for `api/*` endpoints)
- **Interactive session cookies** via the `samlAuth` fixture (best for `internal/*` endpoints)

Both return headers you can spread into `apiClient` requests (`apiKeyHeader` or `cookieHeader`).

## Choose an auth type [choose-auth-type]

| Endpoint                                                                                  | Recommended auth     | Fixture       |
| ----------------------------------------------------------------------------------------- | -------------------- | ------------- |
| [Public APIs](https://www.elastic.co/docs/api/doc/kibana) (usually starting with `api/*`) | API key              | `requestAuth` |
| Internal APIs (usually starting with `internal/*`)                                        | Cookie-based session | `samlAuth`    |

## API key auth [api-key-auth]

Generate credentials once (often in `beforeAll`) and reuse them:

Available methods on `requestAuth`:

| Method                                   | Description                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `getApiKeyForViewer()`                   | Shorthand for `getApiKey('viewer')`                                                              |
| `getApiKeyForPrivilegedUser()`           | Elevated non-admin role; uses `editor` (most) or `developer` (Elasticsearch serverless projects) |
| `getApiKeyForAdmin()`                    | Shorthand for `getApiKey('admin')` (full access); avoid unless required                          |
| `getApiKey(role)`                        | Create an API key for a predefined role by name (the role must exist in the deployment)          |
| `getApiKeyForCustomRole(roleDescriptor)` | Create an API key scoped to a custom Kibana/Elasticsearch role descriptor                        |

```ts
let viewerApiKey: RoleApiCredentials;

apiTest.beforeAll(async ({ requestAuth }) => {
  viewerApiKey = await requestAuth.getApiKeyForViewer();
});

apiTest('calls a public API', async ({ apiClient }) => {
  const res = await apiClient.get('api/console/api_server', {
    headers: { ...viewerApiKey.apiKeyHeader, 'kbn-xsrf': 'scout' },
    responseType: 'json',
  });
  expect(res.statusCode).toBe(200);
});
```

## Cookie-based auth [cookie-auth]

Use an interactive session to simulate how the Kibana UI calls internal endpoints:

Available methods on `samlAuth`:

| Method | Description |
| --- | --- |
| `asInteractiveUser(role)` | Get a `cookieHeader` for a built-in role name (for example `viewer`) or a custom role descriptor |

```ts
apiTest('calls an internal endpoint', async ({ apiClient, samlAuth }) => {
  const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

  const res = await apiClient.get('internal/some/endpoint', {
    headers: { ...cookieHeader, 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'kibana' },
    responseType: 'json',
  });
  expect(res.statusCode).toBe(200);
});
```

## Predefined and custom roles

- **Predefined roles**: built-in roles like `admin`, `editor`, `viewer`. Use `getApiKey()` (or `getApiKeyForViewer()` etc). Privileges are resolved from the appropriate `roles.yml` file.
- **Custom roles**: roles you define for a specific test with explicit and fine-grained Elasticsearch/Kibana privileges.

## Best practices [best-practices]

- Prefer minimal permissions; avoid `admin` unless required.
- Reuse credentials within a suite when possible.
- Include required headers (`kbn-xsrf`, and `x-elastic-internal-origin` for internal endpoints).
