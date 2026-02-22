# Team Conventions & Test Deletion

## Spec File Execution Time

A spec file should not take more than 10 minutes to execute. If it exceeds this:
1. Split into multiple focused spec files
2. Consider moving some tests to API/unit layer
3. Optimize setup/teardown

## File Organization

**Screens folder** (`cypress/screens/`): Extract all element selectors.
```typescript
export const ALERTS_TABLE = '[data-test-subj="alerts-table"]';
```

**Tasks folder** (`cypress/tasks/`): Extract user actions.
```typescript
export const openAlertDetails = (alertId: string) => {
  cy.get(ALERT_ROW).contains(alertId).click();
  cy.get(ALERT_DETAILS_FLYOUT).should('be.visible');
};
```

## Selectors

Always use `data-test-subj` attributes:
```typescript
// Good
cy.get('[data-test-subj="myButton"]');

// Avoid — classes change, IDs may not be unique, indexes are brittle
cy.get('.my-button');
cy.get('#my-button');
cy.get('[data-test-subj="row"]').eq(2);
```

## Data Setup

Prefer API-based setup over `es_archive`:
```typescript
// Preferred
beforeEach(() => {
  cy.request('POST', '/api/detection_engine/rules', rulePayload);
});
```

## Assertions

| Assertion | Use Case |
|-----------|----------|
| `.should('be.visible')` | User-facing elements (buttons, avatars, text, modals) |
| `.should('exist')` | Elements that may be hidden (DOM structure, hidden inputs) |
| `.should('not.exist')` | Confirming element is removed from DOM |
| `.should('not.be.visible')` | Confirming element is hidden but still in DOM |

Prefer `be.visible` over `exist` for user-facing elements — it catches hidden elements, verifies dimensions, and confirms the element isn't covered.

## Data & Cleanup Audit

Before fixing a test, audit all resources it creates:

| Resource Created | Cleanup Method | Cleaned in beforeEach? | Cleaned in afterEach? |
|------------------|----------------|------------------------|----------------------|
| (list each one)  | (API/UI/none)  | yes/no                 | yes/no               |

Key requirements:
- Every created resource must be explicitly cleaned
- Cleanup must be API-based (not UI-based)
- Cleanup should use `failOnStatusCode: false`
- `beforeEach` should handle previous failed runs

```typescript
beforeEach(() => {
  deleteEngine();    // Clean before (handles crashed previous runs)
  cleanFleet();
  login();
});

afterEach(() => {
  deleteEngine();    // Clean after
  cleanFleet();
});
```

## Test Deletion Guidelines

### When to Delete vs Fix

**Delete if:**
- Full duplicate coverage exists at API/unit level
- Skipped for 3+ months with no progress
- Validates purely cosmetic/visual behavior
- Effort to fix exceeds value
- Functionality is deprecated or being removed

**Fix if:**
- Tests unique E2E user flows not covered elsewhere
- Catches real bugs other tests miss
- Fix is straightforward (missing wait, wrong selector)
- Tests a critical user journey

### Deletion Process

1. Verify duplicate coverage (document exact files/test names)
2. Delete the test file
3. Clean up orphaned code (see checklist below)
4. Update related documentation

### Orphaned Code Cleanup Checklist

```
[ ] Check tasks/ files imported by the test
    └─ If only used by deleted test → delete it
[ ] Check screens/ files imported by tasks
    └─ If only used by deleted tasks → delete it
[ ] Check objects/ files imported by the test
    └─ If only used by deleted test → delete it
[ ] Check shared files for orphaned exports
    └─ If function only used by deleted code → remove it
[ ] Run grep to verify no other usages exist before deleting
```

## Before Opening a PR

Make sure your test fails:
1. Temporarily break the assertion or feature
2. Verify the test actually fails
3. Restore the correct state

If you never see your test fail, you don't know if it's testing the right thing.

## Flaky Test Runner

Use the [Flaky Test Runner](https://ci-stats.kibana.dev/trigger_flaky_test_runner) to verify fixes:
1. Go to the CI Stats website
2. Pick a PR or branch
3. Select which test(s) to run
4. Use the default number of executions
5. Start the job at Buildkite

The Flaky Test Runner runs in CI, not locally. Always use the CI Stats website to trigger runs — this ensures the test runs in the same environment where flakiness was observed.

**Specifying the test file:**
```
x-pack/solutions/security/test/security_solution_cypress/cypress/e2e/investigations/alerts/building_block_alerts.cy.ts
```

Always verify fixes with the Flaky Test Runner before merging.

### Viewing Flaky Test History

Use the [Kibana CI Dashboard](https://ops.kibana.dev/s/ci/app/dashboards#/view/cb7380fb-67fe-5c41-873d-003d1a407dad) to:
- See all failures in Kibana CI
- Identify patterns of failures
- Determine if failures are flakiness vs. PR-specific issues

## Flaky Test Process

1. Test starts failing in CI → GitHub issue created automatically
2. Operations team evaluates → if 4+ failures/week for FTR, test is skipped
3. Issue gets labels: `blocker`, `skipped test`, version label
4. Owning team investigates → find root cause
5. Fix is implemented → verify with Flaky Test Runner
6. Test is unskipped → monitor for stability

### Skipping Tags

Always include a GitHub issue link when skipping:
```typescript
// Skip due to flakiness: https://github.com/elastic/kibana/issues/XXXXX
describe.skip('My flaky test', ...);
```
