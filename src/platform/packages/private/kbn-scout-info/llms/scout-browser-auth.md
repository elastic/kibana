# Browser authentication in Scout

Scout uses [SAML](https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/saml) as a unified authentication protocol across all deployment types. In this article we'll explore how to authenticate your Playwright tests using the `browserAuth` fixture.

## Log in with the `browserAuth` fixture

The `browserAuth` fixture provides convenient methods to authenticate with different user roles in your tests, regardless of where your tests run:

| Method                                  | Description                                                                                                                         |
| :-------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| `loginAsAdmin()`                        | Logs in with the `admin` role (full Kibana and Elasticsearch access).                                                               |
| `loginAsPrivilegedUser()`               | Logs in with a privileged non-admin role (`editor`, except for Elasticsearch projects that use the `developer` role).               |
| `loginAsViewer()`                       | Logs in with the `viewer` role (read-only permissions).                                                                             |
| `loginAs(role: string)`                 | Logs in a specific built-in role by name. The role must exist in the deployment's role configuration, otherwise an error is thrown. |
| `loginWithCustomRole(role: KibanaRole)` | Creates a custom role with the specified Kibana and Elasticsearch privileges, and then logs in with that role.                      |

These authentication methods are **asynchronous** and must be awaited.

**Basic usage example:**

```ts
import { expect, tags } from '@kbn/scout';
import { test } from '../fixtures';

// ...

test.describe('My sample test suite', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    // [1]
    // log in as an admin
    await browserAuth.loginAsAdmin(); // [2]
    // ...
  });

  test('my sample test 1', async ({ pageObjects }) => {
    // the browser is already authenticated as admin here
    // ...
  });

  test('my sample test 2', async ({ pageObjects }) => {
    // the browser is already authenticated as admin here
    // ...
  });
});
```

1.  We first unpack the **`browserAuth`** fixture from the test context.
2.  We then log in with the **`admin`** role before each test in the **`beforeEach`** hook.

> **SAML authentication: local deployment vs Elastic Cloud**
>
> When running tests in **local** stateful and serverless environments, Scout creates **on-demand** SAML identities using a trusted **mock Identity Provider (IdP)**, bypassing the need for pre-provisioned users.
>
> However, when running tests on Elastic Cloud, Scout authenticates with **real Elastic Cloud accounts** using credentials from the `<KIBANA_ROOT>/.ftr/role_users.json` or `<KIBANA_ROOT>/.scout/role_users.json` files through the actual cloud Identity Provider.

### Logging in with a custom role

You can log in with a custom role with the `loginWithCustomRole()` method. This is ideal for testing specific permission sets in your plugin:

```ts
test.describe(
  'Discover app with a restricted read-only role',
  { tag: tags.deploymentAgnostic },
  () => {
    test.beforeAll(async () => {
      // load test data
      // ...
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      // log in with custom role
      await browserAuth.loginWithCustomRole({
        kibana: [
          {
            base: [], // [1]
            feature: {
              discover: ['read'],
            },
            spaces: ['*'],
          },
        ],
        elasticsearch: {
          cluster: [], // [2]
          indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }], // [3]
        },
      });
    });

    test('should display a disabled save button', async ({ browserAuth }) => {
      // navigate to Discover and verify read-only access
      // ...
    });
  }
);
```

1.  For testing specific features, use `base: []` and explicit `feature` definitions.
2.  We leave this empty as no cluster privileges are needed for this test.
3.  We define the minimum index privileges needed to access Discover.

> **Warning: Scout vs FTR**
>
> Scout's `loginWithCustomRole()` method internally uses similar role creation logic to FTR's `samlAuth.setCustomRole()` method, but wraps it with **automatic authentication** and **cleanup**, making it a one-step solution for Playwright tests compared to FTR's multi-step approach.

> **What happens behind the scenes?**
>
> When you call `loginWithCustomRole()`, Scout first creates a uniquely named role in Elasticsearch for each Playwright worker (`custom_role_worker_1`, `custom_role_worker_2`, etc.). If your tests run sequentially, Scout will create just one role named `custom_role_worker_1`.
>
> Scout then:
>
> 1.  Creates an authenticated SAML session for the custom role
> 2.  Caches the session for performance (subsequent calls with the same role definition reuse the cached session)
> 3.  Sets the session cookie in your browser context
> 4.  Automatically deletes the custom role after test completion (no matter if the test passed or failed)
>
> If you call `loginWithCustomRole()` again with a different role definition in the same test, Scout **recreates** the role with the new privileges and authenticates with a fresh session.

### Predefined roles vs custom roles

Let's compare **predefined roles** with **custom roles**:

- **Predefined roles** are built-in Elastic roles available to all customers out-of-the-box (like `admin`, `editor`, `viewer`). These work with `loginAs()` and are defined in the appropriate `roles.yml` file. Here's a [list](https://www.elastic.co/docs/deploy-manage/users-roles/cloud-organization/user-roles) for Elastic Cloud.
- **Custom roles** are roles you create specifically for testing with particular permission sets. These require `loginWithCustomRole()` instead.

> **Warning: Scout vs FTR**
>
> **FTR** allows defining custom roles in the test config file under `security.roles`. **Scout** takes a different approach: custom roles are created dynamically using `loginWithCustomRole()`.

### Extending the `browserAuth` fixture

Using `loginWithCustomRole()` works well for one-off cases, but if you need to log in with the same custom role across multiple tests, it's more convenient to extend the `browserAuth` fixture with solution-specific or plugin-specific authentication methods.

#### Solution-scoped extension

The `@kbn/scout-security` package [extends](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/packages/kbn-scout-security/src/playwright/fixtures/test/browser_auth/index.ts) the `browserAuth` fixture to expose Security-specific authentication methods (e.g. `loginAsPlatformEngineer()`):

```ts
// loginAsPlatformEngineer() is available in all tests importing @kbn/scout-security
test.beforeEach(async ({ browserAuth }) => {
  await browserAuth.loginAsPlatformEngineer();
});
```

All Security tests importing `@kbn/scout-security` can now use this method to log in as a Platform Engineer without redefining the custom role in each test.

#### Plugin-scoped extension

A plugin can also extend the `browserAuth` fixture by creating a custom fixture in the plugin's `test/scout/ui/fixtures` directory. For example, the Observability APM plugin [exposes](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/apm/test/scout/ui/fixtures/index.ts#L82-L99) `loginAsApmMonitor()`:

```ts
// loginAsApmMonitor() is available in all tests importing the plugin fixture
test.beforeEach(async ({ browserAuth }) => {
  await browserAuth.loginAsApmMonitor();
});
```

Create a custom fixture that extends `browserAuth` in your plugin's test directory:

```ts
// x-pack/solutions/<solution>/plugins/<private or shared>/my-plugin/test/scout/ui/fixtures/index.ts

import { scoutTestFixtures } from '@kbn/scout'; // [1]
import type { BrowserAuthFixture } from '@kbn/scout'; // [1]

interface MyPluginAuthFixture extends BrowserAuthFixture {
  loginAsMyPluginUser: () => Promise<void>;
}

export const fixtures = scoutTestFixtures.extend<{ browserAuth: MyPluginAuthFixture }>({
  browserAuth: async ({ browserAuth }, use) => {
    const loginAsMyPluginUser = async () =>
      browserAuth.loginWithCustomRole({
        // update as necessary
        elasticsearch: {
          cluster: ['monitor'],
          indices: [{ names: ['my-plugin-*'], privileges: ['read', 'write'] }],
        },
        // update as necessary
        kibana: [
          {
            feature: { myPlugin: ['all'] },
            spaces: ['*'],
          },
        ],
      });

    // make the new method available via the browserAuth fixture
    await use({
      ...browserAuth,
      loginAsMyPluginUser,
    });
  },
});
```

1.  Import from `@kbn/scout-oblt` or from `@kbn/scout-security` if your plugin belongs to a specific solution.

Then use it in your tests:

```ts
import { expect, test } from '../fixtures';

test('my plugin feature works', async ({ browserAuth, page }) => {
  await browserAuth.loginAsMyPluginUser();
  await page.goto('/app/my-plugin');
  // Your test logic
});
```

## Best practices

#### Use deployment-agnostic methods

Scout tests are designed to be deployment agnostic by default. Prefer `loginAsPrivilegedUser()` over `loginAs('editor')` when writing deployment-agnostic tests, as it automatically selects the appropriate role for the deployment type.

#### Keep custom roles minimal

Only grant the **minimum privileges** needed for your test. This makes tests more realistic and helps catch permission-related bugs.

#### Reuse custom roles via fixtures

If multiple tests need the same custom role, extend the `browserAuth` fixture instead of repeating `loginWithCustomRole()` calls.

#### Test permission boundaries

Use custom roles to explicitly test both what users **can** and **cannot** do:

```ts
test('viewer cannot save dashboards', async ({ browserAuth, page }) => {
  await browserAuth.loginAsViewer();
  await page.gotoApp('dashboards');

  // Verify save button is disabled
  await expect(page.testSubj.locator('dashboardSaveButton')).toBeDisabled();
});
```
