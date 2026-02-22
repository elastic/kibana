# Debugging Techniques & Environment Guide

## Debugging Techniques

### Focus on a single test with `.only`

```typescript
it.only('adding new assignees via add button in flyout', () => { ... });
// Or focus on a describe block
describe.only('Updating assignees (single alert)', () => { ... });
```

Remove `.only` before committing.

### Pause execution with `cy.pause()`

```typescript
it('test name', () => {
  expandFirstAlert();
  updateAssigneesViaAddButtonInFlyout(users);
  cy.pause(); // Open DevTools to inspect state
  alertDetailsFlyoutShowsAssignees(users);
});
```

While paused: open DevTools (F12), inspect elements, check selectors, view network requests, step through remaining commands.

### Debug specific assertions

```typescript
cy.get(ALERT_ASIGNEES_COLUMN).eq(0).then($el => {
  cy.log('Column HTML:', $el.html());
});

cy.get('[data-test-subj*="Avatar"]').then($els => {
  cy.log('Found avatars:', $els.length);
});
```

### Combine for fast iteration

```typescript
it.only('test name', () => {
  // ... setup ...
  cy.get(SELECTOR).then($el => { cy.log('State:', $el.html()); });
  cy.pause();
  // ... assertion ...
});
```

Run in headed mode (`--headed`) to see the browser.

## Environment Guide

### General

| Environment | Characteristics |
|-------------|----------------|
| ESS | Full feature set, traditional deployment |
| Serverless | Stateless, may have different feature flags |
| MKI | Kubernetes-based, different auth, performance, API restrictions |

When flaky in only one environment, investigate: feature flag differences, timing/performance, auth flow differences, data availability.

### MKI-Specific Issues

#### 403 Forbidden on API Calls

**Root Cause:** Direct access to internal indices is restricted in MKI.

```typescript
// Fails on MKI
cy.request('PUT', '/.internal-index/_doc/1', data);

// Use application API instead
cy.request('POST', '/api/security/some-endpoint', data);
```

#### "Log in to your account" Page Displayed

**Root Cause:** Performance issues cause session timeout. The app is too slow, causing the session to expire.
**Fix:** Investigate and optimize the application (reduce API calls, optimize rendering, check for memory leaks).

#### Username Assertions Failing

**Root Cause:** `system_indices_superuser` does not exist in MKI.

```typescript
// Fails on MKI
cy.contains('system_indices_superuser');

// Works everywhere
import { getDefaultUsername } from '../tasks/common/users';
cy.contains(getDefaultUsername());
```

Reference: `x-pack/solutions/security/test/security_solution_cypress/cypress/tasks/common/users.ts`

#### Functionality Missing Due to Feature Flag

**Root Cause:** No easy way to enable/disable feature flags in MKI.
**Fix:** Skip on MKI:

```typescript
describe('Feature requiring FF', { tags: ['@skipInServerlessMKI'] }, () => { ... });
```

#### Infrastructure Not Ready

**Symptoms:** Elements disabled, API calls fail with "shards not active" or "index not found", MKI-only failures.
**Root Cause:** MKI infrastructure (indices, shards, ML nodes) may not be ready when test starts.

**Diagnosis:** Check server logs for "primary shards not active", "no node found", "index not ready".

**Fix options:**
1. Add infrastructure readiness checks to test setup
2. Report as environment issue if it's a deployment problem
3. Add appropriate waits for indices/shards to be active
4. Skip on MKI with `@skipInServerlessMKI` if requirements can't be reliably met

### Environment Tag Combinations

| Tags | Behavior |
|------|----------|
| `@ess`, `@serverless` | Runs in both ESS and Serverless PR CI |
| `@ess`, `@serverless`, `@skipInServerless` | Runs in ESS PR CI + Serverless PR CI, skips MKI |
| `@serverless`, `@skipInServerlessMKI` | Runs in Serverless PR CI, skips only MKI |

The periodic pipeline and Kibana QA quality gate are MKI environments.
