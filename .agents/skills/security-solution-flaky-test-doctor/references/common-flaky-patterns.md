# Common Flaky Patterns

## Missing API Wait

**Symptoms:** Element not found, assertion fails on data that should be there.
**Root Cause:** Test asserts before API response is processed.

```typescript
// Before (flaky)
cy.visit('/page');
cy.get('[data-test-subj="data"]').should('contain', 'expected');

// After (stable)
cy.intercept('GET', '/api/data').as('getData');
cy.visit('/page');
cy.wait('@getData');
cy.get('[data-test-subj="data"]').should('contain', 'expected');
```

## Hardcoded Waits

**Symptoms:** Passes locally, fails in CI (or vice versa).
**Root Cause:** `cy.wait(ms)` doesn't account for environment speed differences.

```typescript
// Before (flaky)
cy.get('button').click();
cy.wait(2000);
cy.get('.result').should('be.visible');

// After (stable)
cy.get('button').click();
cy.get('.result', { timeout: 10000 }).should('be.visible');
```

## Test Data Pollution

**Symptoms:** Passes in isolation, fails when run with other tests.
**Root Cause:** Test data from previous tests affects current test.
**Fix:** Proper cleanup in `beforeEach`/`afterEach`, use unique identifiers.

## Forced Actions

**Symptoms:** Test passes but hides real UI bugs, or works locally but fails in CI.
**Root Cause:** `{ force: true }` bypasses visibility and actionability checks.

```typescript
// Before (hides bugs)
cy.get('[data-test-subj="button"]').click({ force: true });

// After (reveals real issues)
cy.get('[data-test-subj="button"]').should('be.visible').click();
```

Same applies to adding extra `click()` before `type()` — `type()` already clicks the input once.

## Index-Based Element Selection

**Symptoms:** Fails after UI changes even though the element still exists.
**Root Cause:** `.eq(index)` is brittle to order changes.

```typescript
// Before (brittle)
cy.get('[data-test-subj="row"]').eq(2).click();

// After (stable)
cy.get('[data-test-subj="row-specific-id"]').click();
```

## Input Field Value Not Entered

**Symptoms:** Test inputs a value but the field remains empty or incorrect.
**Root Cause:** The input element is re-rendered after typing starts.

**Diagnosis:** Add a temporary `cy.wait(500)` before typing. If it passes, re-rendering is the issue.

**Fix:** Check React hooks — look for `useEffect` dependencies causing re-renders, state changes that unmount/remount the component, or async data loading that resets form state.

## React useEffect Timing with Async Data

**Symptoms:** Filter or state not applied on first render, UI shows stale/default values, test worked before a feature flag change.
**Root Cause:** `useEffect` runs AFTER render. State computed from async data isn't ready when child components first render.

```typescript
// Problematic pattern
const rule = useRuleQuery(); // async
useEffect(() => {
  setShowFilter(isBuildingBlock); // Runs AFTER render
}, [isBuildingBlock]);
// Table renders with showFilter = false (default)

// Fix: compute derived state directly
const shouldShowFilter = isBuildingBlock || showFilter;
```

When a test fails after a feature flag change but test code is unchanged, the test is likely catching a **real bug** in the application. The flag changed timing, exposing a latent race condition. Fix the app, not the test.

## Feature Flag Changes Expose Race Conditions

**Symptoms:** Test was stable, became flaky after a feature flag change, no test code changes.
**Root Cause:** Feature flags change loading order, data availability, and rendering timing. A race condition may have always existed but was hidden.

**Investigation:**
```bash
grep -r "featureFlagName" --include="*.ts" --include="*.tsx"
git log --oneline -20 -- path/to/affected/component.tsx
```

## Stale Element Reference with `.within()`

**Symptoms:** Assertion fails to find an element that IS visible in the DOM when you `cy.pause()` and inspect.
**Root Cause:** `.within()` captures a DOM element reference once. If the parent re-renders, subsequent commands look at the stale element.

```typescript
// Problematic: .within() holds stale reference after re-render
cy.get(CONTAINER).within(() => {
  cy.get(SELECTOR).should('be.visible');
});

// Fixed: .find() re-queries from parent on each retry
cy.get(CONTAINER).find(SELECTOR).should('be.visible');
```

`.find()` is chained from the parent query, so Cypress re-queries both parent and child on each retry. `.within()` captures once.

## localStorage Persistence Race Condition

**Symptoms:** Test dismisses a UI element, reloads, and the element reappears.
**Root Cause:** UI dismissals persist state to `localStorage` asynchronously. Reload before persistence completes → state is lost.

```typescript
// Flaky: reloads before localStorage is updated
cy.get(DISMISS_BUTTON).click();
cy.get(CALLOUT).should('not.exist');
cy.reload(); // localStorage may not be persisted yet

// Fixed: wait for localStorage persistence
cy.get(DISMISS_BUTTON).click();
cy.get(CALLOUT).should('not.exist');
const storageKey = 'kibana.securitySolution.detections.callouts.dismissed-messages';
cy.window()
  .then((win) => {
    const dismissed: string[] = JSON.parse(win.localStorage.getItem(storageKey) || '[]');
    return dismissed.some((id) => id.startsWith('expected-callout-id'));
  })
  .should('be.true');
cy.reload();
cy.get(CALLOUT).should('not.exist');
```

Note: `useMessagesStorage` appends `-messages` to storage keys. Some IDs include hash suffixes — use `.startsWith()` instead of exact matching.

## Visualization Elements Require Data

**Symptoms:** Test fails trying to interact with chart legends, treemap cells, or histogram bars.
**Root Cause:** Visualization components only render interactive elements when data exists. Test runs before data loads.

```typescript
// Flaky: chart has no data yet
createRule(getNewRule());
visitWithTimeRange(ALERTS_URL);
clickAlertsHistogramLegend(); // Fails — no legend without data

// Fixed: wait for data first
createRule(getNewRule());
visitWithTimeRange(ALERTS_URL);
waitForAlertsToPopulate();
clickAlertsHistogramLegend(); // Works
```

## API Timeout in CI

**Symptoms:** Timeout waiting for API response, works locally, fails in CI.
**Root Cause:** CI may have shorter default timeouts or slower infrastructure.

**Fix:** Increase timeout for specific slow calls:
```typescript
cy.request({
  method: 'POST',
  url: '/api/fleet/epm/packages',
  timeout: 120000,
  body: packageData,
});
```

Also check `responseTimeout` in `cypress_ci.config.ts`.

## Visual/Overlap Tests

**Symptoms:** Test checks element positioning with `getBoundingClientRect()`, highly sensitive to CSS changes.
**Root Cause:** Visual positioning tests are inherently fragile (rendering timing, viewport differences, CSS animations).

**Recommendation:** Delete if purely cosmetic. Test functionality, not pixel positions.

## Environment-Specific Selector Differences

**Symptoms:** Passes in ESS, fails in Serverless (or vice versa).
**Root Cause:** Attribute values differ between environments (e.g., avatar titles include email in Serverless).

```typescript
// Exact match — fails in Serverless
`[title='${username}']`

// Partial match — works in both
`[title^='${username}']`  // starts-with
`[title*='${username}']`  // contains
```
