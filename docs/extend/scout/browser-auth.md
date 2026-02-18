---
navigation_title: Browser auth
---

# Browser authentication in Scout [scout-browser-auth]

Scout uses SAML as a unified authentication protocol across deployment types. This guide explains how to authenticate Playwright UI tests using the `browserAuth` fixture.

## Log in with the `browserAuth` fixture [scout-browser-auth-login]

The `browserAuth` fixture provides convenience methods to authenticate with different user roles:

| Method | Description |
| --- | --- |
| `loginAsAdmin()` | Logs in with `admin` (full access) |
| `loginAsPrivilegedUser()` | Logs in with a privileged non-admin role (resolved by environment) |
| `loginAsViewer()` | Logs in with `viewer` (read-only) |
| `loginAs(role)` | Logs in with a specific built-in role name |
| `loginWithCustomRole(roleDescriptor)` | Creates a custom role and logs in with that role |

Basic usage:

```ts
import { tags } from '@kbn/scout';
import { test } from '../fixtures';

test.describe('My sample test suite', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    // ... navigate, setup, etc.
  });

  test('my sample test', async ({ pageObjects }) => {
    // browser is already authenticated
  });
});
```

:::::{note}
Local vs Elastic Cloud:

- Local (stateful/serverless): Scout can create on-demand SAML identities using a trusted mock IdP.
- Elastic Cloud: Scout authenticates with real Elastic Cloud accounts using credentials from `<KIBANA_ROOT>/.ftr/role_users.json` (or `<KIBANA_ROOT>/.scout/role_users.json`), via the real IdP.

Internal (Elasticians): provisioning Cloud users/roles is documented in internal AppEx QA documentation.
:::::

## Predefined roles vs custom roles [scout-browser-auth-roles]

- Predefined roles: built-in roles like `admin`, `editor`, `viewer`
- Custom roles: dynamically created roles with specific Kibana/Elasticsearch privileges

## Log in with a custom role [scout-browser-auth-custom-role]

Use `loginWithCustomRole()` to test specific permission sets:

```ts
import { test, tags } from '@kbn/scout';

test.describe('Discover app with a restricted read-only role', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole({
      kibana: [
        {
          base: [],
          feature: { discover: ['read'] },
          spaces: ['*'],
        },
      ],
      elasticsearch: {
        cluster: [],
        indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
      },
    });
  });

  test('should display a disabled save button', async ({ page }) => {
    // ...
  });
});
```

## Extending the `browserAuth` fixture [scout-browser-auth-extend]

If you need the same custom role across many tests, extend `browserAuth` with plugin/solution-specific helpers (rather than repeating `loginWithCustomRole()` everywhere).

Examples in the repository:

- Solution-scoped extension (Security): `https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/packages/kbn-scout-security/src/playwright/fixtures/test/browser_auth/index.ts`
- Plugin-scoped extension (APM): `https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/apm/test/scout/ui/fixtures/index.ts`

## Best practices [scout-browser-auth-best-practices]

- Avoid `admin` unless absolutely necessary.
- Prefer deployment-agnostic helpers like `loginAsPrivilegedUser()` when writing suites that should run everywhere.
- Keep custom roles minimal (least privilege).
- Reuse custom roles by extending fixtures.
- Explicitly test permission boundaries (what users can and cannot do).

