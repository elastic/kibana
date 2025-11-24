/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Conversion Patterns for Non-Scout Tests
 *
 * Provides guidance on converting Cypress E2E tests into unit or integration tests
 * when Scout E2E is not the appropriate choice.
 */

export const CONVERSION_PATTERNS = `# Converting Cypress Tests to Unit/Integration Tests

When a Cypress test is determined to be better suited for unit or integration testing,
this guide provides patterns for conversion.

## Decision Framework

### Convert to Unit Test When:
- Testing pure functions (no side effects)
- Testing business logic in isolation
- Testing data transformation/validation
- Testing utility functions
- Testing React components in isolation
- No external dependencies (API, database, browser)

### Convert to Integration Test When:
- Testing API endpoints without UI
- Testing service layer interactions
- Testing database operations
- Testing middleware/plugins
- Testing authentication flows (API level)
- Testing data pipelines

### Keep as E2E (Scout) When:
- Testing multi-page user workflows
- Testing browser-specific behavior
- Testing complex user interactions
- Testing UI state management across actions
- Testing critical user journeys

---

## Unit Test Conversion Patterns

### Pattern 1: Pure Function Testing

**Cypress Test (WRONG APPROACH):**
\`\`\`typescript
describe('Risk Score Calculator', () => {
  it('should calculate risk score correctly', () => {
    cy.visit('/dashboard');
    cy.window().then((win) => {
      const score = win.calculateRiskScore({ severity: 'high', count: 10 });
      expect(score).to.equal(100);
    });
  });
});
\`\`\`

**Unit Test (CORRECT APPROACH):**
\`\`\`typescript
import { calculateRiskScore } from './risk_calculator';

describe('calculateRiskScore', () => {
  it('should return 100 for high severity with 10 alerts', () => {
    const result = calculateRiskScore({ severity: 'high', count: 10 });
    expect(result).toBe(100);
  });

  it('should return 0 for low severity with 1 alert', () => {
    const result = calculateRiskScore({ severity: 'low', count: 1 });
    expect(result).toBe(0);
  });
});
\`\`\`

**Why:** Pure functions don't need a browser. Test them directly with Jest.

---

### Pattern 2: React Component Testing

**Cypress Test (WRONG APPROACH):**
\`\`\`typescript
describe('Alert Badge', () => {
  it('should render with correct color', () => {
    cy.visit('/component-test');
    cy.get('[data-test-subj="alert-badge"]').should('have.class', 'critical');
  });
});
\`\`\`

**Unit Test (CORRECT APPROACH):**
\`\`\`typescript
import { render, screen } from '@testing-library/react';
import { AlertBadge } from './alert_badge';

describe('AlertBadge', () => {
  it('should render with critical styling', () => {
    render(<AlertBadge severity="critical" />);
    const badge = screen.getByTestId('alert-badge');
    expect(badge).toHaveClass('critical');
  });
});
\`\`\`

**Why:** Component behavior can be tested without a full browser using React Testing Library.

---

### Pattern 3: Data Transformation

**Cypress Test (WRONG APPROACH):**
\`\`\`typescript
describe('Alert Formatter', () => {
  it('should format alerts correctly', () => {
    cy.fixture('alerts.json').then((alerts) => {
      cy.window().then((win) => {
        const formatted = win.formatAlerts(alerts);
        expect(formatted).to.have.length(5);
      });
    });
  });
});
\`\`\`

**Unit Test (CORRECT APPROACH):**
\`\`\`typescript
import { formatAlerts } from './alert_formatter';
import alertsFixture from '../fixtures/alerts.json';

describe('formatAlerts', () => {
  it('should format alerts with correct structure', () => {
    const result = formatAlerts(alertsFixture);

    expect(result).toHaveLength(5);
    expect(result[0]).toMatchObject({
      id: expect.any(String),
      severity: expect.stringMatching(/^(low|medium|high|critical)$/),
      timestamp: expect.any(Number)
    });
  });
});
\`\`\`

**Why:** Data transformation is synchronous and doesn't need browser context.

---

## Integration Test Conversion Patterns

### Pattern 4: API Testing

**Cypress Test (WRONG APPROACH):**
\`\`\`typescript
describe('Alert API', () => {
  it('should create an alert', () => {
    cy.request('POST', '/api/alerts', {
      name: 'Test Alert',
      severity: 'high'
    }).then((response) => {
      expect(response.status).to.equal(201);
      expect(response.body.name).to.equal('Test Alert');
    });
  });
});
\`\`\`

**Integration Test (CORRECT APPROACH):**
\`\`\`typescript
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Alert API', () => {
    it('should create an alert via POST /api/alerts', async () => {
      const response = await supertest
        .post('/api/alerts')
        .send({
          name: 'Test Alert',
          severity: 'high'
        })
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'Test Alert',
        severity: 'high',
        id: expect.any(String)
      });
    });
  });
}
\`\`\`

**Why:** API tests don't need a browser. Use FTR with supertest for faster, more reliable tests.

---

### Pattern 5: Backend Service Testing

**Cypress Test (WRONG APPROACH):**
\`\`\`typescript
describe('Elasticsearch Query', () => {
  it('should query alerts from ES', () => {
    cy.task('queryElasticsearch', {
      index: 'alerts',
      query: { match_all: {} }
    }).then((results) => {
      expect(results.hits.total.value).to.be.greaterThan(0);
    });
  });
});
\`\`\`

**Integration Test (CORRECT APPROACH):**
\`\`\`typescript
export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');

  describe('Alert Elasticsearch queries', () => {
    it('should query alerts from index', async () => {
      const results = await es.search({
        index: 'alerts',
        query: { match_all: {} }
      });

      expect(results.hits.total.value).toBeGreaterThan(0);
    });
  });
}
\`\`\`

**Why:** Backend operations don't need Cypress or a browser.

---

### Pattern 6: Authentication Testing

**Cypress Test (WRONG APPROACH):**
\`\`\`typescript
describe('Login', () => {
  it('should authenticate user', () => {
    cy.request('POST', '/api/auth/login', {
      username: 'admin',
      password: 'password'
    }).then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body.token).to.exist;
    });
  });
});
\`\`\`

**Integration Test (CORRECT APPROACH):**
\`\`\`typescript
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Authentication API', () => {
    it('should return JWT token on successful login', async () => {
      const response = await supertest
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'password'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/); // JWT format
    });
  });
}
\`\`\`

**Why:** API-level auth testing doesn't need browser UI.

---

## Hybrid Approach: Split Complex Tests

### Pattern 7: Split Test into Multiple Types

**Original Cypress Test (TOO MUCH):**
\`\`\`typescript
describe('Alert Workflow', () => {
  it('should create, validate, and display alert', () => {
    // 1. Business logic
    const score = calculateRiskScore(alertData);
    expect(score).to.equal(80);

    // 2. API call
    cy.request('POST', '/api/alerts', { ...alertData, score }).then((response) => {
      expect(response.status).to.equal(201);
    });

    // 3. UI validation
    cy.visit('/alerts');
    cy.get('[data-test-subj="alert-list"]').should('contain', alertData.name);
  });
});
\`\`\`

**Split into 3 Tests:**

**Unit Test (Jest):**
\`\`\`typescript
describe('calculateRiskScore', () => {
  it('should calculate score of 80 for given alert data', () => {
    const score = calculateRiskScore(alertData);
    expect(score).toBe(80);
  });
});
\`\`\`

**Integration Test (FTR):**
\`\`\`typescript
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('POST /api/alerts', () => {
    it('should create alert with calculated score', async () => {
      await supertest
        .post('/api/alerts')
        .send({ ...alertData, score: 80 })
        .expect(201);
    });
  });
}
\`\`\`

**E2E Test (Scout):**
\`\`\`typescript
import { expect, test } from '@kbn/scout';

test.describe('Alert display workflow', () => {
  test('should display newly created alert in list', async ({ page, pageObjects }) => {
    // Setup: Create alert via API
    await pageObjects.api.alerts.create(alertData);

    // Navigate to alerts page
    await page.gotoApp('alerts');

    // Verify UI shows the alert
    await expect(pageObjects.alerts.alertList).toContainText(alertData.name);
  });
});
\`\`\`

**Why:** Each test type focuses on its strength: Jest for logic, FTR for API, Scout for UI workflows.

---

## Migration Steps

### Step 1: Identify Test Type
Use \`scoutAnalyzeTestSuitability\` tool to determine if test should be unit/integration/e2e.

### Step 2: Extract Components
- Extract pure functions → Unit tests
- Extract API calls → Integration tests
- Keep UI workflows → Scout E2E

### Step 3: Refactor
- Move business logic to separate modules
- Create API service layers
- Build page objects for UI patterns

### Step 4: Convert
- Unit: Use Jest + React Testing Library
- Integration: Use FTR + supertest
- E2E: Use Scout (only for necessary UI workflows)

### Step 5: Validate
- Run tests in isolation
- Verify correct test boundaries
- Ensure tests are fast and reliable

---

## Common Pitfalls to Avoid

### Pitfall 1: Over-using E2E
❌ **Bad:** Testing API responses with Cypress
✅ **Good:** Use FTR integration tests

### Pitfall 2: Under-testing Business Logic
❌ **Bad:** Only testing through UI
✅ **Good:** Unit test logic, E2E test workflow

### Pitfall 3: Mixing Concerns
❌ **Bad:** One test doing logic + API + UI
✅ **Good:** Separate tests for each concern

### Pitfall 4: Ignoring Test Speed
❌ **Bad:** 30s E2E test for simple validation
✅ **Good:** 0.1s unit test for same validation

### Pitfall 5: Poor Test Organization
❌ **Bad:** All tests in Cypress folder
✅ **Good:** Unit tests near code, integration in FTR, E2E in Scout

---

## Summary

**Test Pyramid Principle:**
- Many unit tests (fast, focused)
- Some integration tests (moderate speed, service-level)
- Few E2E tests (slow, critical workflows only)

**Conversion Checklist:**
- [ ] Does test need a browser? → If no, not E2E
- [ ] Does test need API calls? → If yes without UI, integration test
- [ ] Does test validate logic only? → If yes, unit test
- [ ] Does test need multi-page workflow? → If yes, Scout E2E
- [ ] Can test be split into smaller tests? → Consider splitting

**Tools Available:**
- \`scoutAnalyzeTestSuitability\` - Determine test type
- \`scoutSuggestTestConversion\` - Get conversion guidance
- \`scoutAssessMigrationRisk\` - Assess migration complexity
`;
