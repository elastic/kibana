---
navigation_title: Page objects
---

# Page objects [scout-page-objects]

Page objects wrap UI interactions (navigation, clicking, filling forms) so tests read like user workflows and stay maintainable as the UI evolves.

::::::{tip}
Keep page objects focused on **UI interactions**. Don’t hide API setup/teardown inside page objects—use [API services](./api-services.md) or [fixtures](./fixtures.md) instead.
::::::

For practical tips, see [best practices](./best-practices.md#page-object-tips).

## Usage [scout-page-objects-usage]

Page objects are exposed through the `pageObjects` fixture and are lazy-initialized:

```ts
test.beforeEach(async ({ browserAuth, pageObjects }) => {
  await browserAuth.loginAsViewer();
  await pageObjects.discover.goto();
});
```

## Where they live [scout-page-objects-where]

- Shared page objects: `@kbn/scout` and solution Scout packages (`<package>/src/playwright/page_objects`)
- Plugin-local page objects: `<plugin-root>/test/scout/ui/fixtures/page_objects`

## Create a plugin page object [create-a-page-object]

Create a class that takes `ScoutPage` and exposes locators + actions:

```ts
import { ScoutPage } from '@kbn/scout';

export class NewPage {
  constructor(private readonly page: ScoutPage) {}

  async goto() {
    await this.page.gotoApp('sample/app/name');
  }
}
```

## Register a plugin page object [register-plugin-page-object]

To make your page object available as `pageObjects.newPage`, register it in your plugin fixtures.

### 1. Register it in `fixtures/page_objects/index.ts`

```ts
import type { PageObjects, ScoutPage } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';
import { NewPage } from './new_page';

export interface MyPluginPageObjects extends PageObjects {
  newPage: NewPage;
}

export function extendPageObjects(pageObjects: PageObjects, page: ScoutPage): MyPluginPageObjects {
  return {
    ...pageObjects,
    newPage: createLazyPageObject(NewPage, page),
  };
}
```

### 2. Wire it into your plugin `test` fixture

In `<plugin-root>/test/scout/ui/fixtures/index.ts`, extend Scout’s `test` so `pageObjects` uses your extended type:

```ts
import { test as base } from '@kbn/scout';
import type { ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';

import type { MyPluginPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export interface MyPluginTestFixtures extends ScoutTestFixtures {
  pageObjects: MyPluginPageObjects;
}

export const test = base.extend<MyPluginTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    { pageObjects, page }: { pageObjects: MyPluginPageObjects; page: ScoutPage },
    use: (pageObjects: MyPluginPageObjects) => Promise<void>
  ) => {
    await use(extendPageObjects(pageObjects, page));
  },
});
```

Now your specs can use `pageObjects.newPage` without importing the page object class directly.
