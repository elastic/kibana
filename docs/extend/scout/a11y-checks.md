---
navigation_title: A11y checks
---

# Accessibility testing (a11y) with Scout [scout-a11y-checks]

Scout includes built-in support for automated accessibility (a11y) checks in UI tests via `page.checkA11y`.

:::::{warning}
Use automated a11y checks to augment, not replace, manual accessibility reviews and assistive technology testing.
:::::

## Automated a11y checks with `page.checkA11y` [scout-checkA11y]

Behind the scenes, `page.checkA11y` runs an [axe-core](https://github.com/dequelabs/axe-core) scan of the current page state. It analyzes the DOM for accessibility violations and returns results you can assert on. Configuration is unified with Cypress and FTR.

### When to run a11y checks [scout-a11y-when]

We recommend adding `page.checkA11y` to:

- Key happy-path flows (for example, landing pages, dashboards, wizards)
- Important interaction states (for example, flyouts, modals, menus, toasts)
- Pages with frequent UI changes where regressions are likely

Avoid running a11y checks on every interaction. Pick a few high-value checkpoints per test or suite to keep runs fast and reduce flakiness.

### Run a full-page a11y check [scout-a11y-full-page]

Run `page.checkA11y()` once the page is fully loaded and the UI has settled:

```ts
test('Dashboard listing page has no basic accessibility violations', async ({
  pageObjects,
  page,
}) => {
  await pageObjects.dashboard.gotoApp();

  // Wait for the page to be ready (example helper)
  await pageObjects.dashboard.waitForListingTableToLoad();

  const { violations } = await page.checkA11y();
  expect(violations).toHaveLength(0);
});
```

### Check specific elements [scout-a11y-specific-elements]

:::::{note}
Prefer running `checkA11y` with `include` set to the root element you are testing. This keeps the scan isolated and reduces runtime.
:::::

```ts
test('Modal dialog is accessible', async ({ page }) => {
  await page.goto('/app/my-plugin');
  await page.testSubj.click('open-modal');

  const modal = page.locator('[role="dialog"]');
  await expect(modal).toBeVisible();

  const { violations } = await page.checkA11y({
    include: ['[role="dialog"]'],
  });
  expect(violations).toHaveLength(0);
});
```

### Use `test.step` to “box” checks [scout-a11y-boxing]

```ts
test('should load dashboard from listing page', async ({ pageObjects, page }) => {
  await pageObjects.dashboard.gotoApp();
  await pageObjects.dashboard.waitForListingTableToLoad();

  await test.step('no basic accessibility violations on the listing page', async () => {
    const { violations } = await page.checkA11y();
    expect(violations).toHaveLength(0);
  });

  // continue with the flow...
});
```

### Troubleshooting flaky or failing checks [scout-a11y-troubleshooting]

If a failure isn’t caused by your change and there isn’t a quick fix, don’t disable the entire a11y check. Prefer excluding the specific problematic element so the suite still provides coverage:

```ts
test('Form components are accessible', async ({ page }) => {
  await page.goto('/app/my-plugin/create');

  const { violations } = await page.checkA11y({
    exclude: ['[data-test-subj="problematic-element"]'],
  });

  expect(violations).toHaveLength(0);
});
```

## Understanding a11y violations in reports [scout-a11y-reporting]

When `page.checkA11y` detects violations, the returned `violations` array includes details such as:

- `id` (rule id, for example `color-contrast`)
- `impact` (`critical`, `serious`, `moderate`, `minor`)
- `description`
- `nodes` (elements that violate the rule)
- `helpUrl`

Violations appear in the Scout HTML report.

## Best practices [scout-a11y-best-practices]

- Use `include` to target specific regions
- Wait for page readiness before scanning
- Focus on critical paths and key interaction states
- Assert `violations.length === 0`
- Combine with manual testing
