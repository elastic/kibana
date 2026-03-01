# Migration Best Practices

## Table of Contents
- [Testing Layer Priority](#testing-layer-priority)
- [Waits and Assertions](#waits-and-assertions)
- [Page Objects](#page-objects)
- [API-Based Setup/Teardown](#api-based-setupteardown)
- [test.step() for Execution Time](#teststep-for-execution-time)
- [Parallelization](#parallelization)
- [Fixtures](#fixtures)
- [Package Organization](#package-organization)
- [EUI Wrappers](#eui-wrappers)

## Testing Layer Priority

| Layer | Use For | Flake Risk |
|-------|---------|------------|
| Unit (RTL, Jest) | Component rendering, hooks, utilities | Lowest |
| API (Scout API, integration) | Data validation, API contracts, RBAC | Low |
| UI (Scout UI) | User workflows, page interactions, E2E flows | Higher |

Only use Scout UI tests for behavior that genuinely requires a browser.

## Waits and Assertions

```typescript
// Forbidden
await page.waitForTimeout(2000);

// Locator assertions auto-retry
await expect(page.testSubj.locator('myElement')).toBeVisible();

// Poll for async conditions
await expect.poll(async () => {
  return await page.testSubj.locator('alertRow').count();
}).toBeGreaterThan(0);
```

## Page Objects

Extract **all locators as `readonly` properties** initialized in the constructor — never create locators inline in methods. This keeps selectors centralized and makes them easy to audit or update.

```typescript
class DashboardPage {
  readonly riskScoreTable: Locator;
  readonly enableEntityStoreButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.riskScoreTable = this.page.testSubj.locator('entity-analytics-risk-score');
    this.enableEntityStoreButton = this.page.testSubj.locator('enable-entity-store-btn');
  }

  async goto() {
    await this.page.gotoApp('securitySolution:entity_analytics');
  }

  async enableEntityStore() {
    await this.enableEntityStoreButton.click();
  }
}
```

Split large pages into smaller page objects or component objects. Assertions stay in specs, not page objects.

If a needed `data-test-subj` doesn't exist, add it to the source component.

### Locator preferences

In order of preference:

1. **`page.testSubj.locator('...')`** — `data-test-subj` attributes, most stable
2. **`getByRole('row')`, `getByRole('button', { name: '...' })`** — ARIA roles, semantic and resilient to class changes
3. **CSS `:has()` for parent selection** — `page.locator('span:has([data-test-subj="..."])')` over `locator('xpath=..')`
4. **Scoped locators** — `parent.locator('[data-test-subj="child"]')` to avoid strict mode violations

Avoid:
- EUI CSS class selectors (`.euiTableRow`, `.euiToolTipAnchor`) — these are internal and can change between EUI versions
- XPath (`xpath=..`) — less readable, prefer CSS `:has()` for parent selection
- Unscoped locators when the same `data-test-subj` appears in multiple DOM locations

## API-Based Setup/Teardown

```typescript
spaceTest.beforeAll(async ({ apiServices }) => {
  await apiServices.ruleService.createRule(ruleConfig);
});

spaceTest.afterAll(async ({ apiServices, scoutSpace }) => {
  await apiServices.ruleService.deleteAllRules();
  await scoutSpace.savedObjects.cleanStandardList();
});
```

Do not use `esArchiver` to manipulate system indices — use `kbnClient`.

## test.step() for Execution Time

Each `test()` block creates a new browser context. Use `test.step()` for multi-step flows to reuse context:

```typescript
spaceTest('full workflow', async ({ pageObjects }) => {
  await spaceTest.step('create entity', async () => {
    await pageObjects.entityStore.createEntity(entityConfig);
  });

  await spaceTest.step('verify entity appears', async () => {
    await expect(pageObjects.dashboard.entityRow(entityConfig.name)).toBeVisible();
  });
});
```

## Parallelization

Use `spaceTest` + `scoutSpace` — each worker gets its own Kibana space.

- Pre-ingest shared ES data in `parallel_tests/global.setup.ts` via `globalSetupHook()`
- Clean up space-scoped mutations in `afterAll`
- Place parallel specs in `test/scout*/ui/parallel_tests/`
- Place sequential specs in `test/scout*/ui/tests/`

## Fixtures

**Test fixture** — each test gets a fresh, isolated instance:
```typescript
export const test = baseTest.extend<MyFixtures>({
  myFixture: async ({}, use) => {
    const resource = await createResource();
    await use(resource);
    await cleanupResource(resource);
  },
});
```

**Worker fixture** — shared across tests within the same worker:
```typescript
export const test = baseTest.extend<{}, MyWorkerFixtures>({
  sharedService: [async ({}, use) => {
    const service = await initService();
    await use(service);
  }, { scope: 'worker' }],
});
```

## Package Organization

| Package | Use For |
|---------|---------|
| `@kbn/scout` | Code usable across all solutions |
| `@kbn/scout-security` | Security-specific code |

Put shared code in `@kbn/scout`, security-specific code in `@kbn/scout-security`.

## EUI Wrappers

Scout provides wrappers for stable EUI interactions — import from `@kbn/scout`:
`EuiComboBoxWrapper`, `EuiDataGridWrapper`, `EuiSelectableWrapper`, `EuiCheckBoxWrapper`, `EuiFieldTextWrapper`, `EuiCodeBlockWrapper`, `EuiSuperSelectWrapper`, `EuiToastWrapper`

## Kibana Component Interaction Patterns

Patterns learned from real migrations. These apply across all Kibana plugins, not just Security.

### Kibana query bar (`QueryStringInput`)

The unified SearchBar's `QueryStringInput` submits `this.props.query` (the React prop) on Enter — **not** the DOM textarea value. Playwright's `fill()` sets the DOM value synchronously, but React's props update asynchronously. If `press('Enter')` fires before props sync, the component submits the stale (old) query and the change never takes effect.

```typescript
// Broken — fill() races with React prop sync
await textarea.fill('host.name: *');
await textarea.press('Enter'); // submits stale props.query (empty string)

// Working — pressSequentially types character-by-character, giving React time
await textarea.click();
await textarea.clear();
await textarea.pressSequentially('host.name: *');
await textarea.press('Enter');
```

This applies to any `QueryStringInput` in Kibana (Timeline, Discover, rule builders, etc.).

### EuiBasicTable empty-state row

`EuiBasicTable` always renders a `<tr class="euiTableRow">` for its "no items found" message. You cannot assert `.euiTableRow` count as 0 — the empty-state row is always present.

```typescript
// Broken — always finds at least 1 row (the empty-state row)
await expect(table.locator('.euiTableRow')).toHaveCount(0);

// Working — assert the empty-state message text
await expect(table).toContainText('0 timelines match the search criteria');
```

When the table has actual data rows, the empty-state row is not rendered, so row counts > 0 work normally.

### EUI disabled button tooltip

EUI wraps disabled buttons in a tooltip anchor `<span>` that intercepts pointer events. To trigger the tooltip on hover, target the wrapper element, not the button.

```typescript
// Broken — hover never reaches the disabled button
await saveButton.hover();

// Working — hover the tooltip anchor wrapper
await saveButton.locator('xpath=..').hover();
await expect(tooltip).toBeVisible();
```

### Scoping locators to avoid strict mode violations

Some elements (e.g., save-status badges, action buttons) appear in multiple DOM locations. Scope locators to the relevant container to avoid Playwright strict mode violations.

```typescript
// Risky — may match elements in the bottom bar AND the header panel
readonly saveStatus = this.page.testSubj.locator('timeline-save-status');

// Safe — scoped to the header panel
readonly saveStatus = this.panel.locator('[data-test-subj="timeline-save-status"]');
```

### `force: true` for app-level DOM instability

When an application bug causes continuous DOM re-rendering (e.g., a `useEffect` loop triggering table `refetch()`), elements inside affected containers get detached before Playwright's actionability checks complete. In these cases, `force: true` is a valid workaround — but always document the app bug and the affected source location.

```typescript
// EUI's collapsed actions popover re-renders continuously due to
// app bug in StatefulOpenTimeline: useEffect on noteIds triggers refetch().
// See: open_timeline/index.tsx lines ~406-419
await this.createFromTemplateButton.click({ force: true });
```

This is distinct from porting Cypress `{ force: true }` blindly — it's a documented workaround for a known app issue.
