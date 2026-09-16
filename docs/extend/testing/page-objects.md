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

This section is the single source of truth for where Scout UI helpers live and what they may contain. The `@kbn/scout` README and the solution Scout packages link here instead of repeating it.

Every rule carries a tag that says how it is enforced:

- `lint:<rule>` is an ESLint rule and fails the PR.
- `script:<check>` is a deterministic fact reported by `node scripts/scout audit` (in progress). It never decides on its own.
- `judgment` is a call a maintainer (or the audit skill) makes by reading the code. The audit reports it, a human acts.

A rule with no tag is not a rule. Prose that nothing checks is what rots first.

### The three tiers [scout-page-objects-tiers]

The tier of an object is decided by **what emits the `data-test-subj` values it targets**, never by its file name or its current folder.

| Tier                    | Lives in                                                                                                          | Wraps                                                                                                                                                                    | Reached through                                                    | Examples                                                                                                                                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EUI component object    | `@elastic/eui-test-helpers`, re-exported from `kbn-scout/src/playwright/eui_components`                           | One EUI component                                                                                                                                                        | `page.components.<name>(testSubj)`                                 | `comboBox`, `dataGrid`, `toast`                                                                                                                                                                                              |
| Kibana component object | `kbn-scout/src/playwright/ui_components`                                                                          | One Kibana component that is rendered inside more than one app. Where it is exported from does not matter: a `@kbn/*` package, a plugin's `public/`, or core all qualify | `pageObjects.<key>` (or direct import when it holds no page state) | `KibanaCodeEditorWrapper` (`@kbn/code-editor`), `DataGrid` (`@kbn/unified-data-table`), `QueryBar` and `FilterBar` (`unified_search` plugin), `SavedObjectSaveModal` (`saved_objects` plugin), `Toasts` (core notifications) |
| App page object         | `kbn-scout/src/playwright/page_objects`, a solution package, or a plugin's `test/scout*/ui/fixtures/page_objects` | One app, management screen, or chrome area. Its subjects are emitted by that app's plugin or by core chrome                                                              | `pageObjects.<key>`                                                | `dashboard`, `discover`, `lens`, `maps`, `dataViewsManagement`, `collapsibleNav`, `chrome`                                                                                                                                   |

How to tell a Kibana component object from an app page object: list the object's distinct Kibana `data-test-subj` values (ignore EUI-emitted ones such as `superDatePicker*` or `euiToast*`). If more than half are emitted by one component that at least two different apps render, it is a Kibana component object owned by that component's module. Otherwise it is an app page object owned by the plugin that emits them. `script:subj-ownership`

Rules:

- `eui_components` contains re-exports only. No Kibana logic, no selectors. If an EUI component has no helper yet, contribute one to [EUI test helpers](./eui-test-helpers.md), do not wrap it here. `judgment`
- A Kibana class may wrap an EUI component object to add Kibana behaviour (for example `Toasts` fixes the `globalToastList` subject core sets and adds Kibana wait semantics). It is then a Kibana component object in `ui_components`. If it adds nothing over the EUI helper, delete it and use `page.components.*` directly. `judgment`
- `DataGrid` is the worked example: it targets `unifiedDataTable*` subjects, rendered by Discover and other apps, so it is the `@kbn/unified-data-table` component object, not a generic grid, even though its file sits in `page_objects` today. `script:subj-ownership`
- EUI-emitted subjects inside a Kibana component object or app page object are fine while no EUI helper method covers them. They do not change the tier. `judgment`
- Two objects that share three or more `data-test-subj` values, where at least one is a component object, are a duplication candidate. The fix is always on the app side: the app page object drops its copies and calls the component object. Dashboard and Lens each re-target three `SavedObjectSaveModal` subjects today, so they are the first two candidates. `script:subj-overlap`
- Scout code does not target EUI internals by CSS class when a helper method exists. The rule is keyed on exact selector, so a violation always has a named fix. Selectors with no helper method are not violations, they are gaps to file against EUI test helpers. `lint:@kbn/eslint/scout_no_raw_eui_selectors`
- A helper with no `data-test-subj` target at all (for example waiting on `data-render-complete`) is a utility, not a page object. It lives in `page_objects/utils`, whether as a function or an exported class, and is not registered as a `pageObjects` key. If only one object uses it, make it a private method of that object instead. `judgment`
- Register an object as a `pageObjects.<key>` when specs call it directly. An object that only other page objects compose (a save modal opened from Dashboard and Lens, a code editor embedded in a filter editor) can be a plain export instead. Both forms are fine, the key is what must never change once it exists. `judgment`
- The folder is normative for new code. For existing code the audit reports a tier and folder mismatch as a move candidate. The move keeps the fixture key (see below). `script:subj-ownership`

### Shared, solution, or plugin-local [scout-page-objects-scope]

`@kbn/scout` is a critical package. Any change to it re-runs the whole Scout suite, so it holds only what is genuinely shared.

Components and apps use different tests, because every app is rendered by exactly one plugin and "who renders it" alone would send Dashboard and Lens plugin-local.

**Kibana component objects** go by who renders the component:

- Rendered inside two or more apps (the definition of a Kibana component object): `@kbn/scout`, regardless of how many tests use the object today. A single consumer is not a reason to move it. Moving a shared component's test API into the one plugin that happens to use it makes that plugin the de facto owner, and the next consumer copies it. That is how FTR page objects multiplied. `script:subj-ownership`, `judgment`
- Rendered inside apps of one solution only: that solution's package. `judgment`

**App page objects** go by the app's group and by who drives it in tests:

- The app's plugin has `group: "platform"` in `kibana.jsonc` and tests in at least one other module drive it, or a `@kbn/scout` fixture depends on it (the login page under `browserAuth`): `@kbn/scout`. Dashboard, Discover, Lens, Maps, Visualize, Home, Data Views Management and the chrome objects all meet this today. `script:app-group`, `script:consumers`
- The app's plugin has `group: "platform"` and only its own tests drive it: that plugin's `test/scout*/ui/fixtures/page_objects`. It moves up when a second module needs it (promotion below). `script:app-group`, `script:consumers`
- The app's plugin has a solution group (`security`, `observability`, `search`): the solution package if two or more of that solution's modules drive it, otherwise plugin-local. Never `@kbn/scout`. `script:app-group`, `script:consumers`
- Chrome areas whose subjects core itself emits (`chrome`, `collapsibleNav`) belong in `@kbn/scout`. `appMenu` is not one of them: its subjects come from `@kbn/app-menu`, a shared package, so the component test above applies and it is a Kibana component object. `judgment`

**Rules that apply to both:**

- Needed by a second plugin that already depends on the owning plugin: stay in the owner and import it as a test helper (see the README's [Reusing a Page Object from another plugin](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-scout/README.md#reusing-a-page-object-from-another-plugin)). `judgment`
- Promotion: a plugin-local object imported by two or more other modules is a promotion candidate for the solution package or `@kbn/scout`. The importing modules are the queue. `script:cross-module-imports`
- Demotion: an object in `@kbn/scout` or a solution package with zero consumers outside its own package, and not used by the package's own fixtures, is a demotion or deletion candidate. New objects added ahead of their first consumer are exempt for one release. `script:consumers`
- The same class name in two Scout locations is a duplication candidate. Check before adding. `script:duplicate-names`
- Any move into a plugin needs an explicit ack from that plugin's code owners before the work starts. When the checks above disagree, the default verdict is keep. `judgment`

Consumer counts are computed by fixture key (`pageObjects.<key>`, `page.components.<key>`, `apiServices.<key>`) and attributed to the nearest `kibana.jsonc` module. Import graphs cannot see page objects because they are Proxy fixtures, so a tool that reports "unused export" for a page object is wrong, not the page object. `script:consumers`

### Fixture keys are public API [scout-page-objects-stability]

- `pageObjects.<key>`, `page.components.<key>` and `apiServices.<key>` are frozen. This policy governs file location and class naming, never the key. A file may move between tiers or folders and keep its key. `judgment`
- Renaming a key is a breaking change for every Scout suite. If one is ever accepted: export both keys, mark the old one `@deprecated` with the replacement in the JSDoc, keep it for two minor releases, ship a codemod under `scripts/scout`, and appex-qa authors the consumer migration PRs. Consuming teams are not asked to migrate on their own. `judgment`
- Solution packages spread `...pageObjects`, so a core key change is a cross-team change. Their code owners review it. `judgment`
- Announce moves and deprecations in the `@kbn/scout` README changelog and in `#kibana-scout`. `judgment`

### Definitions [scout-page-objects-definitions]

- **Module**: the directory owning the nearest `kibana.jsonc`. A plugin with three `test/scout_*` roots is one module.
- **Consumer**: a file outside the object's own package that reads its fixture key (property access, destructuring in the test callback or body, a forwarded `pageObjects` parameter, or a type-only `PageObjects['key']` reference), or imports the class directly. Access through a solution package's `extendPageObjects` spread counts for the core object.
- **Emits**: a module emits a `data-test-subj` value when the string appears in its React source. Ownership of a subject is the module that emits it. When more than one module emits the same string, the owner is the one that exports the component carrying it, and a plugin that only re-renders that component does not count. If that still does not settle it, the module with the fewest other emitted subjects in the object wins, since it is the more specific one.
- **Kibana component**: a React component rendered inside two or more apps, wherever it is exported from (a `@kbn/*` package, a plugin's `public/`, or core). Rendering through another shared component counts: the date range picker reaches Discover through the unified search bar, and that is enough.
- **Component vs module**: the tier test counts by component, not by module. `unified_search` is one module that exports several components, and `QueryBar` and `FilterBar` are separate component objects for that reason.
- **App group**: the `group` field of the app plugin's `kibana.jsonc` (`platform`, `security`, `observability`, `search`).

### Recording an exception [scout-page-objects-exceptions]

When the audit flags something and the decision is to keep it, record that next to the code so the record dies with it:

```ts
// scout-audit: keep -- wraps @kbn/unified-tabs, Discover is the only consumer today
export class UnifiedTabs {
```

The audit skill and the PR reviewer skill treat marked items as decided and do not re-flag them. Deterministic checks use a baseline file next to the audit script instead, edited in the same PR under appex-qa review.

### API services [scout-page-objects-api-services]

`apiServices.<key>` helpers under `kbn-scout/src/playwright/fixtures/scope/worker/apis` follow the same shared, solution, or plugin-local rules and the same frozen-key rule. See [API services](./api-services.md).

### Layout inside a package [scout-page-objects-layout]

Each Scout package keeps its page objects under one `page_objects` directory and exports them from its `index.ts` barrel. New solution packages use `src/playwright/page_objects`. Existing packages keep their current root until they choose to move, and the audit script reads each package's root rather than assuming one layout. `script:duplicate-names`

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
