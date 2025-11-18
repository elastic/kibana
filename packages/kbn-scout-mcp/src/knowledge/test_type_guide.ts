/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Test Type Selection Guide
 *
 * Provides decision trees and guidelines for choosing the right test type
 * (unit, integration, or E2E) for different testing scenarios.
 */

export const TEST_TYPE_GUIDE = `# Test Type Decision Guide

## Overview

Choosing the right test type is critical for building a maintainable, fast, and reliable test suite.
This guide helps you decide between Unit Tests (Jest), Integration Tests (FTR/API), and E2E Tests (Scout).

## The Test Pyramid

\`\`\`
     /\\
    /  \\     E2E Tests (Scout)
   /____\\    - Slowest, most expensive
  /      \\   - Highest integration coverage
 /        \\  - Most prone to flakiness
/__________\\

    /\\       Integration Tests (FTR/API)
   /  \\      - Medium speed
  /____\\     - Tests service interactions
 /      \\    - More stable than E2E
/__________\\

      /\\     Unit Tests (Jest)
     /  \\    - Fastest
    /____\\   - Most focused
   /      \\  - Highest reliability
  /__________\\
\`\`\`

## Decision Tree

### START: What are you testing?

#### 1. Pure function or utility?
**YES** → **Unit Test (Jest)**
- Examples: calculations, formatters, validators, data transformations
- Why: No external dependencies, instant feedback, easy to debug
- Framework: Jest with @testing-library for React

**NO** → Continue to #2

#### 2. React component rendering (no complex interactions)?
**YES** → **Unit Test (React Testing Library)**
- Examples: component displays correct data, conditional rendering, props validation
- Why: Fast, focused, reliable
- Note: If component needs complex user interactions across multiple components, consider E2E

**NO** → Continue to #3

#### 3. API endpoint only (no UI)?
**YES** → **Integration Test (FTR)**
- Examples: POST /api/endpoint, GET /api/data, API validation
- Why: Tests real backend without UI overhead
- Framework: Kibana FTR with supertest

**NO** → Continue to #4

#### 4. Multiple page navigation?
**YES** → **E2E Test (Scout)**
- Examples: User creates item → navigates to list → sees item
- Why: Tests full user workflow with browser state
- Framework: Scout (Playwright)

**NO** → Continue to #5

#### 5. Browser-specific behavior?
**YES** → **E2E Test (Scout)**
- Examples: drag-and-drop, complex interactions, real browser rendering
- Why: Needs actual browser environment
- Framework: Scout (Playwright)

**NO** → Re-evaluate - likely Unit or Integration test

## Test Type Characteristics

### Unit Tests (Jest)

**Best For:**
- ✅ Pure functions and utilities
- ✅ React component rendering (basic)
- ✅ Business logic and calculations
- ✅ Data transformations
- ✅ Hook behavior (isolated)
- ✅ Validators and formatters
- ✅ Helper functions

**Examples:**
\`\`\`typescript
// ✅ GOOD: Pure function
describe('calculateRiskScore', () => {
  it('should sum alert severities', () => {
    const alerts = [{ severity: 5 }, { severity: 3 }];
    expect(calculateRiskScore(alerts)).toBe(8);
  });
});

// ✅ GOOD: Component rendering
describe('AlertBadge', () => {
  it('should display severity level', () => {
    render(<AlertBadge severity="high" />);
    expect(screen.getByText('High')).toBeInTheDocument();
  });
});

// ❌ BAD: Should be E2E
describe('Alert workflow', () => {
  it('should create alert and navigate to dashboard', () => {
    // This needs browser navigation - use Scout!
  });
});
\`\`\`

**Characteristics:**
- Speed: < 1s per test
- Maintenance: Low
- Flakiness: Very low
- Coverage: Focused on specific function/component

### Integration Tests (FTR/API)

**Best For:**
- ✅ API endpoints (request/response)
- ✅ Service layer interactions
- ✅ Database operations
- ✅ Elasticsearch queries
- ✅ Backend workflows (no UI)
- ✅ Data pipeline testing

**Examples:**
\`\`\`typescript
// ✅ GOOD: API endpoint test
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Detection Rules API', () => {
    it('should create a rule', async () => {
      const response = await supertest
        .post('/api/detection_engine/rules')
        .send({ name: 'Test Rule', type: 'query' })
        .expect(200);

      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('Test Rule');
    });
  });
}

// ❌ BAD: Should be Unit Test
it('should validate rule name format', () => {
  // Pure validation logic - use Jest!
});

// ❌ BAD: Should be E2E
it('should create rule via UI', () => {
  // UI interaction - use Scout!
});
\`\`\`

**Characteristics:**
- Speed: 5-10s per test
- Maintenance: Medium
- Flakiness: Low
- Coverage: Service integration, no UI

### E2E Tests (Scout)

**Best For:**
- ✅ Full user workflows (multi-step)
- ✅ Cross-component interactions
- ✅ UI state management across views
- ✅ Browser-specific behavior
- ✅ Complex user journeys
- ✅ Real browser rendering requirements
- ✅ Features spanning multiple pages

**Examples:**
\`\`\`typescript
// ✅ GOOD: Multi-page workflow
import { expect, spaceTest } from '@kbn/scout-security';

spaceTest.describe('Alert Investigation Workflow', { tag: ['@ess'] }, () => {
  spaceTest('should investigate alert from detection to timeline', async ({
    page,
    pageObjects
  }) => {
    // Step 1: Create rule
    await page.gotoApp('security', { path: '/rules' });
    await pageObjects.rulesPage.createRule(ruleData);

    // Step 2: Wait for alert
    await page.gotoApp('security', { path: '/alerts' });
    await pageObjects.alertsPage.waitForAlert(ruleName);

    // Step 3: Investigate in timeline
    await pageObjects.alertsPage.investigateInTimeline(alertId);
    await expect(pageObjects.timelinePage.events).toContainText(ruleName);
  });
});

// ❌ BAD: Should be Unit Test
test('should format alert timestamp', () => {
  // Pure function - use Jest!
});

// ❌ BAD: Should be Integration Test
test('should create alert via API', () => {
  // No UI needed - use FTR!
});
\`\`\`

**Characteristics:**
- Speed: 30s+ per test
- Maintenance: Medium
- Flakiness: Medium (use proper waits!)
- Coverage: Full user workflow end-to-end

## Red Flags for E2E Tests

### ❌ Don't use E2E (Scout) for:

1. **Testing a single component in isolation**
   - Use: Unit test with React Testing Library
   - Why: No need for full browser context

2. **Testing API response format**
   - Use: Integration test with FTR
   - Why: Faster, more focused, no UI overhead

3. **Testing calculations or data transformations**
   - Use: Unit test with Jest
   - Why: Pure logic, no external dependencies

4. **Testing hook return values**
   - Use: Unit test with @testing-library/react-hooks
   - Why: Can be tested in isolation

5. **Testing utility functions**
   - Use: Unit test with Jest
   - Why: Simple, fast, no browser needed

6. **Testing single API endpoint behavior**
   - Use: Integration test with FTR
   - Why: Backend-only validation

### ✅ Do use E2E (Scout) for:

1. **Multi-step user workflows**
   - Example: "User creates rule → goes to alerts → investigates in timeline"
   - Why: Tests full integration with browser state

2. **Features spanning multiple pages**
   - Example: "User searches → filters → exports results"
   - Why: Requires page navigation and state persistence

3. **Browser rendering requirements**
   - Example: "Chart renders with correct data visualization"
   - Why: Needs real browser rendering engine

4. **Complex state management across components**
   - Example: "Filter changes update multiple dashboard panels"
   - Why: Tests component interaction in real environment

5. **Real user scenarios end-to-end**
   - Example: "Security analyst investigates threat from alert to case"
   - Why: Validates complete user journey

## Speed and Maintenance Trade-offs

### Speed Comparison
\`\`\`
Unit Test:        ████ < 1s (VERY FAST)
Integration Test: ████████ 5-10s (FAST)
E2E Test:         ████████████████████████████████ 30s+ (ACCEPTABLE)
\`\`\`

### Maintenance Effort
\`\`\`
Unit Test:        █ LOW (focused, stable)
Integration Test: ███ MEDIUM (backend changes affect)
E2E Test:         ████ MEDIUM (UI changes affect)
\`\`\`

### Flakiness Risk
\`\`\`
Unit Test:        █ VERY LOW (deterministic)
Integration Test: ██ LOW (backend stability)
E2E Test:         ████ MEDIUM (timing, UI changes)
\`\`\`

## Common Scenarios

### Scenario 1: Testing a Calculation Function
\`\`\`typescript
// What: Calculate risk score from alerts
// Answer: UNIT TEST ✅
// Why: Pure function, no dependencies, instant feedback

describe('calculateRiskScore', () => {
  it('should sum severities', () => {
    expect(calculateRiskScore(alerts)).toBe(expected);
  });
});
\`\`\`

### Scenario 2: Testing API Endpoint
\`\`\`typescript
// What: POST /api/detection_engine/rules creates rule
// Answer: INTEGRATION TEST ✅
// Why: Tests backend, no UI needed, faster than E2E

it('should create rule', async () => {
  const response = await supertest
    .post('/api/detection_engine/rules')
    .send(ruleData)
    .expect(200);
});
\`\`\`

### Scenario 3: Testing User Workflow
\`\`\`typescript
// What: User creates rule, navigates to alerts, sees alert fired
// Answer: E2E TEST (SCOUT) ✅
// Why: Multi-page workflow, browser state, full integration

test('should show alert after rule creation', async ({ page, pageObjects }) => {
  await pageObjects.rulesPage.createRule(data);
  await page.gotoApp('security', { path: '/alerts' });
  await expect(pageObjects.alertsPage.alert).toBeVisible();
});
\`\`\`

### Scenario 4: Testing Component Rendering
\`\`\`typescript
// What: AlertBadge component shows correct severity
// Answer: UNIT TEST ✅
// Why: Component in isolation, no complex interactions

it('should display severity', () => {
  render(<AlertBadge severity="high" />);
  expect(screen.getByText('High')).toBeInTheDocument();
});
\`\`\`

## Migration Considerations

### When Migrating from Cypress to Scout:

**STOP and analyze first:**
1. Does this test really need E2E?
2. Could it be an integration test?
3. Could it be a unit test?

**Common Cypress Anti-patterns:**
\`\`\`typescript
// ❌ BAD: Testing API via UI
cy.visit('/rules');
cy.get('[data-test-subj="createRule"]').click();
// ... fill form ...
cy.get('[data-test-subj="submit"]').click();

// ✅ BETTER: Direct API test
supertest.post('/api/detection_engine/rules').send(data);

// ✅ OR: E2E test for UI workflow
test('should create rule via UI', async ({ page, pageObjects }) => {
  await pageObjects.rulesPage.fillRuleForm(data);
  await pageObjects.rulesPage.submit();
});
\`\`\`

## Best Practices

### 1. Follow the Test Pyramid
- **Many** unit tests (base)
- **Some** integration tests (middle)
- **Few** E2E tests (top)

### 2. Use the Right Tool for the Job
- Don't use E2E for unit-testable code
- Don't use unit tests for integration scenarios
- Don't use integration tests for complex UI workflows

### 3. Consider Maintenance Cost
- More E2E tests = slower CI, more maintenance
- More unit tests = faster feedback, easier debugging

### 4. Test at the Right Level
- Test business logic with unit tests
- Test service integration with integration tests
- Test user workflows with E2E tests

## Quick Reference

| What You're Testing | Use This | Why |
|---------------------|----------|-----|
| Pure function | Unit (Jest) | Fast, focused, reliable |
| Component render | Unit (RTL) | No browser needed |
| API endpoint | Integration (FTR) | Backend only |
| Multi-page flow | E2E (Scout) | Full user journey |
| Browser behavior | E2E (Scout) | Needs browser |
| Calculation | Unit (Jest) | Pure logic |
| Database query | Integration (FTR) | Service layer |
| User workflow | E2E (Scout) | End-to-end validation |

## Summary

**Use Unit Tests** when testing isolated functions, components, or logic.
**Use Integration Tests** when testing API endpoints or service interactions.
**Use E2E Tests (Scout)** when testing full user workflows across multiple pages.

When in doubt, prefer the lower level test (unit > integration > E2E) for speed and reliability.
`;
