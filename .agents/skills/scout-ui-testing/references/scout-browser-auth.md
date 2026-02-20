# Scout Browser Authentication

Use the `browserAuth` fixture to authenticate UI tests without manual UI logins.

## Common methods

- `loginAsAdmin()`
- `loginAsPrivilegedUser()`
- `loginAsViewer()`
- `loginAs(role: string)`
- `loginWithCustomRole(role: KibanaRole)`

These methods are async and must be awaited.

## Basic usage

```ts
import { tags } from '@kbn/scout'; // or the module's Scout package (e.g. @kbn/scout-search)
import { expect } from '@kbn/scout/ui'; // or '@kbn/scout-search/ui', etc.
import { test } from '../fixtures';

test.describe('my suite', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('does something', async ({ page }) => {
    await expect(page.testSubj.locator('someElement')).toBeVisible();
  });
});
```

## Custom roles

Use `loginWithCustomRole()` for one-off permission sets. If a custom role is
used across multiple tests, extend the `browserAuth` fixture in the plugin's
`test/scout*/ui/fixtures` and add a helper like `loginAsMyRole()`.
