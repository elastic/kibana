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

## Placement policy [scout-page-objects-where]

Where a Scout UI helper lives and what it may contain. The `@kbn/scout` README and the solution Scout packages link here instead of repeating it.

### The three tiers [scout-page-objects-tiers]

The tier is decided by what renders the UI the object targets, not by the object's name or its current folder.

| Tier                    | Lives in                                                                                                          | Wraps                                                                                                    | Reached through                      | Examples                                                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| EUI component object    | `@elastic/eui-test-helpers`, re-exported from `kbn-scout/src/playwright/eui_components`                           | One EUI component. Re-exports only, no Kibana logic                                                      | `page.components.<name>(testSubj)`   | `comboBox`, `dataGrid`, `toast`                                                                                                       |
| Kibana component object | `kbn-scout/src/playwright/ui_components`                                                                          | One Kibana component that two or more apps render, wherever it is exported from (`@kbn/*`, plugin, core) | `pageObjects.<key>` or direct import | `KibanaCodeEditorWrapper` (`@kbn/code-editor`), `DataGrid` (`@kbn/unified-data-table`), `QueryBar` and `FilterBar` (`unified_search`) |
| App page object         | `kbn-scout/src/playwright/page_objects`, a solution package, or a plugin's `test/scout*/ui/fixtures/page_objects` | One app, management screen, or chrome area                                                               | `pageObjects.<key>`                  | `dashboard`, `discover`, `lens`, `collapsibleNav`                                                                                     |

- If an EUI component has no helper yet, contribute one to [EUI test helpers](./eui-test-helpers.md) rather than wrapping it in Kibana. A Kibana class may wrap an EUI helper only when it adds Kibana behaviour (for example `Toasts` fixes the `globalToastList` subject core sets). If it adds nothing, use `page.components.*` directly.
- Do not target EUI internals by CSS class when a helper method exists. Enforced by `@kbn/eslint/scout_no_raw_eui_selectors`, which is keyed on exact selector so every violation names its fix. Selectors with no helper method are gaps to file against EUI test helpers, not violations.
- A helper with no `data-test-subj` target at all (for example waiting on `data-render-complete`) is a utility under `page_objects/utils`, not a `pageObjects` key.

### Shared, solution, or plugin-local [scout-page-objects-scope]

`@kbn/scout` is a critical package. Any change to it re-runs the whole Scout suite, so it holds only what is genuinely shared.

- **Kibana component objects**: rendered inside two or more apps means `@kbn/scout`, regardless of how many tests use the object today. Moving a shared component's test API into the one plugin that happens to use it makes that plugin the de facto owner, and the next consumer copies it. That is how FTR page objects multiplied. Rendered only inside one solution's apps means that solution's package.
- **App page objects**: a `platform` group app that tests in another module drive, or that a `@kbn/scout` fixture depends on (login under `browserAuth`), lives in `@kbn/scout`. A `platform` app only its own tests drive stays plugin-local. A solution group app lives in the solution package when two or more of that solution's modules drive it, otherwise plugin-local. Never in `@kbn/scout`.
- A second plugin that already depends on the owning plugin imports the page object as a test helper instead of copying it (see the README's [Reusing a Page Object from another plugin](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-scout/README.md#reusing-a-page-object-from-another-plugin)).
- Before adding a class, search the Scout packages and `test/scout*` directories for the same class name. Same name in two places is a duplicate until proven otherwise.
- Any move into a plugin needs an ack from that plugin's code owners. When in doubt, keep.

Consumer counts come from `node scripts/scout audit`, which greps fixture keys (`pageObjects.<key>`) and attributes each hit to its `kibana.jsonc` module. Page objects are Proxy fixtures, so import graph tools report every one of them as unused. That signal is wrong, not the page object. Run the audit by hand when touching page objects. It is not wired into CI.

### Fixture keys are public API [scout-page-objects-stability]

`pageObjects.<key>`, `page.components.<key>` and `apiServices.<key>` never change. This policy governs file location and class naming only. A file may move between tiers or folders and keep its key. Solution packages spread `...pageObjects`, so a core key change is a cross-team change and their code owners review it.

### Recording an exception [scout-page-objects-exceptions]

When a review or audit flags something and the decision is to keep it, record that next to the code so the record dies with it:

```ts
// scout-audit: keep -- wraps @kbn/unified-tabs, Discover is the only consumer today
export class UnifiedTabs {
```

`apiServices.<key>` helpers under `kbn-scout/src/playwright/fixtures/scope/worker/apis` follow the same rules. See [API services](./api-services.md).

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
