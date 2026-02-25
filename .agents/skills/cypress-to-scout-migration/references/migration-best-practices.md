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

```typescript
class DashboardPage {
  constructor(private readonly page: ScoutPage) {}

  async goto() {
    await this.page.gotoApp('securitySolution:entity_analytics');
  }

  get riskScoreTable() {
    return this.page.testSubj.locator('entity-analytics-risk-score');
  }

  async enableEntityStore() {
    await this.page.testSubj.locator('enable-entity-store-btn').click();
  }
}
```

Split large pages into smaller page objects or component objects. Assertions stay in specs, not page objects.

If a needed `data-test-subj` doesn't exist, add it to the source component.

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
