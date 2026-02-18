---
navigation_title: API auth
---

# Authentication in Scout API tests [scout-api-auth]

Scout supports two ways to authenticate API tests:

- **API keys** via the `requestAuth` fixture (best for `api/*` endpoints)
- **Interactive session cookies** via the `samlAuth` fixture (best for `internal/*` endpoints)

Both return headers you can spread into `apiClient` requests (`apiKeyHeader` or `cookieHeader`).

## Choose an auth type [choose-auth-type]

| Endpoint                                                                                  | Recommended auth     |
| ----------------------------------------------------------------------------------------- | -------------------- |
| [Public APIs](https://www.elastic.co/docs/api/doc/kibana) (usually starting with `api/*`) | API key              |
| Internal APIs (usually starting with `internal/*`)                                        | Cookie-based session |

## API key auth [api-key-auth]

Generate credentials once (often in `beforeAll`) and reuse them:

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

Use `getApiKeyForCustomRole()` when you need fine-grained permissions.

## Cookie-based auth [cookie-auth]

Use an interactive session to simulate how the Kibana UI calls internal endpoints:

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

## Best practices [best-practices]

- Prefer minimal permissions; avoid `admin` unless required.
- Reuse credentials within a suite when possible.
- Include required headers (`kbn-xsrf`, and `x-elastic-internal-origin` for internal endpoints).
