---
navigation_title: Page objects
---

# Page objects [scout-page-objects]

Tests can use page objects to interact with a page or component. From the Playwright [page object model documentation](https://playwright.dev/docs/pom):

> A page object represents a part of your web application. An e-commerce web application might have a home page, a listings page and a checkout page. Each of them can be represented by page object models.

The `@kbn/scout` package contains page objects to interact with EUI components and Kibana UI screens (under `src/playwright/page_objects`). Solution-specific Scout packages contain page objects for solution-specific Kibana screens.

:::::{warning}
Page objects should focus exclusively on **UI interactions** (clicking buttons, filling forms, navigating). They should **not** make API calls directly. Use [API services](./api-services.md) or [fixtures](./fixtures.md) for server-side interactions.
:::::

For practical guidance, see [best practices](./best-practices.md#page-object-tips).

## Usage [scout-page-objects-usage]

All page objects are available via the `pageObjects` fixture, but only the ones used in a test are initialized:

```ts
test.describe('My test suite', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeEach(async ({ pageObjects }) => { <1>
    await pageObjects.discover.goto(); <2>
  });

  test('sample test', async ({ pageObjects }) => {
    await pageObjects.datePicker.setAbsoluteRange(testData.RANGE_DATES); <3>
    // ...
  });
});
```

1. Page objects are accessed via the `pageObjects` fixture.
2. Navigate to the Discover screen using the `pageObjects.discover` page object provided by `@kbn/scout`.
3. `@kbn/scout` page objects also help you interact with EUI components (for example, the date picker).

## Create a new page object [create-a-page-object]

First, create a new page object class. For example:

```ts
import { ScoutPage } from '@kbn/scout'; <1>

export class NewPage {
  private readonly sampleFlyout;
  private readonly sampleEditor;

  constructor(private readonly page: ScoutPage) {
    this.sampleFlyout = this.page.testSubj.locator('sampleFlyout'); <2>
    this.sampleEditor = this.page.testSubj.locator('sampleEditor');
  }

  async goto() { <3>
    await this.page.gotoApp('sample/app/name');
  }

  async waitForRenderComplete() { <4>
    // first wait for the editor to be present
    await this.sampleEditor.waitFor({ state: 'visible' });

    // then wait for another element to be fully rendered
    return this.page
      .locator('div[data-dom-id][data-render-complete="true"]')
      .waitFor(); <5>
  }

  async getFlyoutInnerText() {
    return this.sampleFlyout.innerText();
  }

  // ...
}
```

1. `ScoutPage` extends the Playwright `Page` interface with methods specific to Kibana.
2. Define page elements in the `constructor`.
3. Provide a navigation method for the page.
4. Consider adding a “render complete” wait to reduce flakes.
5. You can optionally specify a timeout.

:::::{note}
Where to put page objects:

- `@kbn/scout` and `@kbn/scout-<solution>` **package** page objects live in `<scout_package>/src/playwright/page_objects`.
- Plugin-specific page objects should be added to `<plugin_path>/test/scout/ui/fixtures/page_objects`.
:::::

## Register the page object in a plugin [register-page-objects]

After creating a page object class, register it with `createLazyPageObject` so it’s available via the `pageObjects` fixture.

In the same directory, create an `index.ts` file to register the page object (it may already exist):

```ts
import { PageObjects, ScoutPage, createLazyPageObject } from '@kbn/scout'; <1>
import { NewPage } from './new_page'; <2>

export interface MyPluginPageObjects extends PageObjects {
  newPage: NewPage; <3>
}

export function extendPageObjects( <4>
  pageObjects: PageObjects,
  page: ScoutPage
): MyPluginPageObjects {
  return {
    ...pageObjects,
    newPage: createLazyPageObject(NewPage, page),
  };
}
```

1. `createLazyPageObject` guarantees page objects are lazy-initialized.
2. Import the page object you created.
3. Expose it as `pageObjects.newPage` in tests.
4. This helper extends core Scout page objects with plugin-defined ones.

Finally, in `<plugin_path>/test/scout/ui/fixtures`, extend the `pageObjects` fixture:

```ts
import { test as base } from '@kbn/scout';
import type { ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';

import { extendPageObjects, MyPluginPageObjects } from './page_objects'; <1>

export interface MyPluginTestFixtures extends ScoutTestFixtures {
  pageObjects: MyPluginPageObjects; <2>
}

export const test = base.extend<MyPluginTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: MyPluginPageObjects;
      page: ScoutPage;
    },
    use: (pageObjects: MyPluginPageObjects) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page); <3>
    await use(extendedPageObjects); <4>
  },
});
```

1. Import `extendPageObjects` and `MyPluginPageObjects`.
2. Extend the fixture typing so tests see your page objects.
3. Build the extended page objects (plugin + core).
4. Register them via `use()`.

Your page object is now available in tests:

```ts
test('sample test', async ({ pageObjects }) => {
  await pageObjects.newPage.goto();
  await pageObjects.newPage.waitForRenderComplete();
  // ...
});
```

