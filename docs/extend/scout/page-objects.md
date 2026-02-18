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

Then register it so it becomes available as `pageObjects.newPage` (see `createLazyPageObject` usage in existing plugin fixtures).
