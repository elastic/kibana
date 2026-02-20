---
navigation_title: Browser auth
---

# Browser authentication in Scout [scout-browser-auth]

Use the `browserAuth` fixture to authenticate **UI tests**. Scout uses **SAML**, so the same approach works across deployment types.

## Log in with `browserAuth` [scout-browser-auth-login]

Available methods:

| Method                                | Description                                                                 |
| ------------------------------------- | --------------------------------------------------------------------------- |
| `loginAsViewer()`                     | Read-only flows using the built-in `viewer` role                            |
| `loginAsPrivilegedUser()`             | Resolves to `editor`, or `developer` for Elasticsearch serverless projects  |
| `loginAsAdmin()`                      | Admin-only behavior (full access); avoid unless required                    |
| `loginAs(role)`                       | Log in with a specific built-in role by name (must exist in the deployment) |
| `loginWithCustomRole(roleDescriptor)` | Log in with a specific set of Kibana and Elasticsearch privileges           |

```ts
test.beforeEach(async ({ browserAuth, pageObjects }) => {
  await browserAuth.loginAsViewer();
  await pageObjects.dashboard.goto();
});
```

::::::{note}
Local runs can create on-demand identities via a trusted mock IdP. Cloud runs authenticate using pre-provisioned users (internal provisioning details live in [internal AppEx QA documentation](https://docs.elastic.dev/appex-qa/create-cloud-users)).
::::::

## Custom roles [scout-browser-auth-custom-role]

Use `loginWithCustomRole()` to test permission boundaries with least privilege:

```ts
await browserAuth.loginWithCustomRole({
  kibana: [{ spaces: ['*'], base: [], feature: { discover: ['read'] } }],
  elasticsearch: {
    indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
  },
});
```

## Reuse role helpers [scout-browser-auth-extend]

If the same login/role is needed across many tests, extend `browserAuth` in your solution/package/plugin fixtures instead of repeating role descriptors.

Examples in the repo:

- [Security](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/packages/kbn-scout-security/src/playwright/fixtures/test/browser_auth/index.ts)
- [APM](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/apm/test/scout/ui/fixtures/index.ts)

## Best practices [scout-browser-auth-best-practices]

- Avoid `admin` unless you’re explicitly testing admin-only behavior.
- Prefer `loginAsPrivilegedUser()` for suites that run across multiple environments.
- Keep custom roles minimal and document why they exist.
