---
navigation_title: Page objects
---

# Page objects [scout-page-objects]

Page objects wrap UI interactions (navigation, clicking, filling forms) so tests read like user workflows and stay maintainable as the UI evolves.

::::::{tip}
Keep page objects focused on **UI interactions**. Don’t hide API setup/teardown inside page objects—use [API services](./api-services.md) or [fixtures](./fixtures.md) instead.
::::::

For practical tips, see the page object guidelines in [UI test best practices](./ui-best-practices.md#use-existing-page-objects-to-interact-with-the-kibana-ui).

::::::{tip}
For interacting with individual EUI components (combo boxes, data grids, and so on), use the [EUI test helpers](./eui-test-helpers.md) exposed through `page.components` rather than hand-rolling selectors in a page object.
::::::

## Usage [scout-page-objects-usage]

Page objects are exposed through the `pageObjects` fixture and are lazy-initialized:

```ts
import { tags } from '@kbn/scout';
import { test } from '../fixtures';

test.describe('My suite', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.discover.goto({ queryMode: 'classic' });
  });
});
```

## Where they live [scout-page-objects-where]

- Core page objects: `@kbn/scout` (available as `pageObjects.<name>`)
- Solution Scout packages may provide additional page objects (their internal folder layout varies—search within the package for `page_objects` if you need the source).
- Plugin-local page objects: `<plugin-root>/test/scout/ui/fixtures/page_objects`

### Where do page objects belong? [scout-page-objects-placement]

Use this when deciding whether a new helper belongs in `@kbn/scout`, a [solution Scout package](./scout.md#scout-packages), or your plugin.

::::::{warning}
Default to your plugin. `@kbn/scout` is a critical package: any change to it reruns the whole Scout suite for everyone. Only the two cases below justify putting a helper there.
::::::

**Three tiers.** The tier follows what renders the UI the helper targets, not the helper's name or current folder.

| Tier                                          | Lives in                                                                                | Wraps                                                                                                     | Reached through                      |
| --------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| [EUI component object](./eui-test-helpers.md) | `@elastic/eui-test-helpers`, re-exported from `kbn-scout/src/playwright/eui_components` | One EUI component. Re-exports only                                                                        | `page.components.<name>(testSubj)`   |
| Kibana component object                       | `kbn-scout/src/playwright/ui_components`                                                | One shared Kibana component, rendered by two or more plugins (from a `@kbn/*` package, a plugin, or core) | `pageObjects.<key>` or direct import |
| App page object                               | `kbn-scout/src/playwright/page_objects`, a solution package, or plugin-local            | One screen that a single plugin renders (an app, a management section, a chrome area)                     | `pageObjects.<key>`                  |

**Where it goes.**

- A helper for a shared Kibana component goes in `@kbn/scout`, even if only one plugin's tests use it today. The component is already rendered by several plugins, so their tests will need it too. If the helper sits in the first plugin that needed it, the next plugin copies it.
- A helper for a screen that a platform plugin renders goes in `@kbn/scout` only when tests outside that plugin drive it, or when a `@kbn/scout` fixture depends on it (the login page under `browserAuth`). If only the plugin's own tests drive it, keep it plugin-local. Any change to `@kbn/scout` re-runs the whole Scout suite.
- A helper for a screen that a solution plugin renders goes in that solution's Scout package when two or more of the solution's plugins drive it, otherwise plugin-local. Never in `@kbn/scout`.
- Before adding a class, search all Scout locations for the same class name. Same name in two places is a duplicate until proven otherwise. `node scripts/scout audit` reports how many files and modules use each `pageObjects` key, which is the input for these decisions.

**Fixture keys are public API.** `pageObjects.<key>`, `page.components.<key>` and `apiServices.<key>` never change. A file may move between tiers or folders and keep its key.

To make your page object available as `pageObjects.newPage`, register it in your plugin fixtures.

## Create and register a new page object in your plugin

::::::::::{stepper}

:::::::::{step} Create a plugin page object

Create a class that takes `ScoutPage` and exposes locators + actions:

```ts
import { ScoutPage } from '@kbn/scout';

export class NewPage {
  constructor(private readonly page: ScoutPage) {}

  async goto() {
    await this.page.gotoApp('myPlugin'); // replace with your app id
  }
}
```

`gotoApp` accepts an optional second argument with `params` (query string) and `hash` (URL hash):

```ts
// Navigate to '/app/myPlugin?_g=(time:(from:now-15m,to:now))'
await this.page.gotoApp('myPlugin', { params: { _g: '(time:(from:now-15m,to:now))' } });

// Navigate to '/app/dashboards#/view/abc-123'
await this.page.gotoApp('dashboards', { hash: '/view/abc-123' });
```

:::::::::

:::::::::{step} Register a plugin page object

Register it in `fixtures/page_objects/index.ts`

```ts
import type { PageObjects, ScoutPage } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';
import { NewPage } from './new_page';

export type MyPluginPageObjects = PageObjects & {
  newPage: NewPage;
};

export function extendPageObjects(pageObjects: PageObjects, page: ScoutPage): MyPluginPageObjects {
  return {
    ...pageObjects,
    newPage: createLazyPageObject(NewPage, page),
  };
}
```

:::::::::

:::::::::{step} Wire it into your plugin `test` fixture

In `<plugin-root>/test/scout/ui/fixtures/index.ts`, extend Scout’s `test` so `pageObjects` has your extended type:

```ts
import { test as base } from '@kbn/scout';

import type { MyPluginPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export const test = base.extend<{ pageObjects: MyPluginPageObjects }>({
  pageObjects: async ({ pageObjects, page }, use) => {
    await use(extendPageObjects(pageObjects, page));
  },
});
```

Now your specs can use `pageObjects.newPage` without importing the page object class directly.

:::::::{note}
If your page object constructor needs extra arguments, pass them after `page`:

`createLazyPageObject(NewPage, page, extraArg1, extraArg2)`.

If you use `spaceTest` (parallel UI suites), extend it the same way: import `spaceTest as base` from `@kbn/scout`, then `export const spaceTest = base.extend<{ pageObjects: MyPluginPageObjects }>(...)`.
:::::::

:::::::::

::::::::::
