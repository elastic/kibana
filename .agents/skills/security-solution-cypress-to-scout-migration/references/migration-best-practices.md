# Migration Best Practices

## Testing Layer Priority

Exercise behavior in the least flaky automation layer first:

| Layer | Use For | Flake Risk |
|-------|---------|------------|
| Unit (RTL, Jest) | Component rendering, hooks, utilities | Lowest |
| API (Scout API, integration) | Data validation, API contracts, RBAC | Low |
| UI (Scout UI) | User workflows, page interactions, E2E flows | Higher |

Only use Scout UI tests for behavior that genuinely requires a browser.

## Treat Test Code as Production Code

Apply the same standards to test code: clear naming, proper abstractions, code review, and maintenance. Sloppy test code leads to flaky, unmaintainable tests.

## Test Names

Write meaningful, descriptive names that serve as documentation:

```typescript
// Bad
spaceTest('works correctly', async () => { ... });

// Good
spaceTest('displays risk score after entity store initialization', async () => { ... });
```

## Readability

Write tests that anyone can understand at a glance:

```typescript
spaceTest('creates a detection rule and verifies alert generation', async ({ pageObjects }) => {
  await spaceTest.step('create a new custom query rule', async () => {
    await pageObjects.ruleCreation.createCustomQueryRule(ruleConfig);
  });

  await spaceTest.step('verify alert appears in alerts table', async () => {
    await pageObjects.alerts.navigateToAlerts();
    await expect(pageObjects.alerts.alertRow(ruleConfig.name)).toBeVisible();
  });
});
```

## Make Sure Your Test Fails

Before submitting:
1. Intentionally break the assertion or feature
2. Verify the test actually fails
3. Restore the correct state

If you never see your test fail, you don't know if it's testing anything.

## Selectors

Use `data-test-subj` over classes:
- `data-test-subj` must be unique within the document
- Classes change for styling
- `data-test-subj` is dedicated to testing and won't be removed by refactoring

If a needed `data-test-subj` doesn't exist, add it to the source component.

## No esArchiver for System Indices

Use `kbnClient` to set up any needed context. Do not use `esArchiver` to manipulate system indices.

## No Hardcoded Waits

```typescript
// Forbidden
await page.waitForTimeout(2000);

// Use locator assertions (auto-retry)
await expect(page.testSubj.locator('myElement')).toBeVisible();

// Or poll for conditions
await expect.poll(async () => {
  const count = await page.testSubj.locator('alertRow').count();
  return count;
}).toBeGreaterThan(0);
```

## Page Objects

Encapsulate page structure and behavior. Keep assertions in specs, not page objects.

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

If a page becomes too large or has pop-ups/reusable UI sections, split into smaller page objects or component objects.

## API-Based Setup/Teardown

Create test context through API, not UI:

```typescript
spaceTest.beforeAll(async ({ apiServices }) => {
  await apiServices.ruleService.createRule(ruleConfig);
});

spaceTest.afterAll(async ({ apiServices, scoutSpace }) => {
  await apiServices.ruleService.deleteAllRules();
  await scoutSpace.savedObjects.cleanStandardList();
});
```

## test.step() for Execution Time

Each `test()` block creates a new browser context. For long scenarios where context can be reused, use `test.step()`:

```typescript
spaceTest('full workflow', async ({ pageObjects }) => {
  await spaceTest.step('create entity', async () => {
    await pageObjects.entityStore.createEntity(entityConfig);
  });

  await spaceTest.step('verify entity appears', async () => {
    await expect(pageObjects.dashboard.entityRow(entityConfig.name)).toBeVisible();
  });

  await spaceTest.step('check risk score', async () => {
    await expect(pageObjects.dashboard.riskScore(entityConfig.name)).toHaveText('Low');
  });
});
```

Steps appear in Playwright's trace viewer and HTML report, making failures easier to debug.

## Parallelization

Parallelize tests when possible using `spaceTest` + `scoutSpace`:
- Each worker gets its own Kibana space for isolation
- Pre-ingest shared ES data in `parallel_tests/global.setup.ts` via `globalSetupHook()`
- Clean up space-scoped mutations in `afterAll`

Place parallel specs in `test/scout*/ui/parallel_tests/`.
Place sequential specs in `test/scout*/ui/tests/`.

## Fixtures

### Test Fixture
Use when each test needs its own fresh, isolated version of setup/state:
```typescript
export const test = baseTest.extend<MyFixtures>({
  myFixture: async ({}, use) => {
    const resource = await createResource();
    await use(resource);
    await cleanupResource(resource);
  },
});
```

### Worker Fixture
Use when multiple tests can safely share the same setup within a worker:
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
| `@kbn/scout-oblt` | Observability-specific code |
| `@kbn/scout-search` | Search-specific code |

Put shared code in `@kbn/scout`, solution-specific code in the solution package.

## EUI Wrappers

Scout provides wrappers for stable EUI interactions:
- `EuiComboBoxWrapper`
- `EuiDataGridWrapper`
- `EuiSelectableWrapper`
- `EuiCheckBoxWrapper`
- `EuiFieldTextWrapper`
- `EuiCodeBlockWrapper`
- `EuiSuperSelectWrapper`
- `EuiToastWrapper`

Import from `@kbn/scout` and use as class members in page objects.
