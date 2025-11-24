/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Cypress to Scout Migration Mappings
 *
 * Based on kibana-code-agents repository patterns
 */

export const CYPRESS_TO_SCOUT_MAPPINGS = `
# Cypress to Scout Migration Mappings

## Selector Conversions

| Cypress | Scout |
|---------|-------|
| \`cy.get('[data-test-subj="x"]')\` | \`page.testSubj.locator('x')\` |
| \`cy.get('[data-test-subj="x"]').click()\` | \`await page.testSubj.click('x')\` |
| \`cy.get('[data-test-subj="x"]').type('text')\` | \`await page.testSubj.locator('x').fill('text')\` |
| \`cy.get('.myClass')\` | \`page.locator('.myClass')\` |
| \`cy.contains('text')\` | \`page.locator('text=text')\` |

## Action Conversions

| Cypress | Scout |
|---------|-------|
| \`.click()\` | \`await element.click()\` |
| \`.type('text')\` | \`await element.fill('text')\` |
| \`.clear()\` | \`await element.clear()\` |
| \`.select('value')\` | \`await element.selectOption('value')\` |
| \`.check()\` | \`await element.check()\` |
| \`.uncheck()\` | \`await element.uncheck()\` |

## Assertion Conversions

| Cypress | Scout |
|---------|-------|
| \`.should('be.visible')\` | \`await expect(element).toBeVisible()\` |
| \`.should('not.be.visible')\` | \`await expect(element).not.toBeVisible()\` |
| \`.should('have.text', 'Expected')\` | \`await expect(element).toHaveText('Expected')\` |
| \`.should('contain.text', 'Part')\` | \`await expect(element).toContainText('Part')\` |
| \`.should('have.value', 'text')\` | \`await expect(element).toHaveValue('text')\` |
| \`.should('be.checked')\` | \`await expect(element).toBeChecked()\` |
| \`.should('be.disabled')\` | \`await expect(element).toBeDisabled()\` |
| \`.should('exist')\` | \`await expect(element).toBeAttached()\` |
| \`.should('not.exist')\` | \`await expect(element).not.toBeAttached()\` |

## Wait Conversions

| Cypress | Scout |
|---------|-------|
| \`cy.wait(2000)\` | \`await page.waitForTimeout(2000)\` (avoid!) |
| \`.should('be.visible')\` | \`await expect(element).toBeVisible()\` |
| \`cy.wait('@alias')\` | \`await page.waitForResponse(...)\` |

## Navigation Conversions

| Cypress | Scout |
|---------|-------|
| \`cy.visit('/app/security')\` | \`await page.gotoApp('security')\` |
| \`cy.visit('/app/security/rules')\` | \`await page.gotoApp('security', { path: '/rules' })\` |
| \`cy.reload()\` | \`await page.reload()\` |
| \`cy.go('back')\` | \`await page.goBack()\` |

## API Call Conversions

Cypress \`cy.request()\` or \`cy.task()\` → Scout API Service:

\`\`\`typescript
// Cypress
cy.request({
  method: 'POST',
  url: '/api/detection_engine/rules',
  body: ruleData,
});

// Scout - Use API Service
await apiServices.detectionRule.createCustomQueryRule(ruleData);
\`\`\`

\`\`\`typescript
// Cypress
cy.task('deleteAllRules');

// Scout - Use API Service
await apiServices.detectionRule.deleteAll();
\`\`\`

## Authentication Conversions

| Cypress | Scout |
|---------|-------|
| \`login('admin')\` (custom command) | \`await browserAuth.loginAsAdmin()\` |
| \`login('viewer')\` | \`await browserAuth.loginAsViewer()\` |

## Network Intercept Conversions

\`\`\`typescript
// Cypress
cy.intercept('GET', '/api/alerts*').as('getAlerts');
cy.wait('@getAlerts');

// Scout
await page.waitForResponse(
  (response) => response.url().includes('/api/alerts')
);
\`\`\`

## Conditional Logic Conversions

\`\`\`typescript
// Cypress
cy.get('body').then(($body) => {
  if ($body.find('[data-test-subj="modal"]').length > 0) {
    cy.get('[data-test-subj="closeModal"]').click();
  }
});

// Scout
const modal = page.testSubj.locator('modal');
if (await modal.isVisible()) {
  await page.testSubj.click('closeModal');
}
\`\`\`

## Chaining Conversions

\`\`\`typescript
// Cypress
cy.get('[data-test-subj="container"]')
  .find('[data-test-subj="button"]')
  .click();

// Scout
const container = page.testSubj.locator('container');
const button = container.locator('[data-test-subj="button"]');
await button.click();
\`\`\`

## Within Block Conversions

\`\`\`typescript
// Cypress
cy.get('[data-test-subj="container"]').within(() => {
  cy.get('input').type('text');
  cy.get('button').click();
});

// Scout
const container = page.testSubj.locator('container');
await container.locator('input').fill('text');
await container.locator('button').click();
\`\`\`

## Alias Conversions

\`\`\`typescript
// Cypress
cy.get('[data-test-subj="element"]').as('myElement');
cy.get('@myElement').click();

// Scout - Just use variables
const myElement = page.testSubj.locator('element');
await myElement.click();
\`\`\`

## Custom Command Conversions

Analyze what custom commands do:
- **UI actions** → Page object methods
- **API calls** → API service methods
- **Setup/teardown** → beforeEach/afterEach with API services

\`\`\`typescript
// Cypress Custom Command
Cypress.Commands.add('createRule', (rule) => {
  cy.request('POST', '/api/detection_engine/rules', rule);
});

// Convert to:
// 1. API Service method (if it doesn't exist)
// 2. Use in test with apiServices.detectionRule.create()
\`\`\`

## Screens and Tasks Conversion

**Cypress screens** (selector constants) → Scout page object **locators**:

\`\`\`typescript
// Cypress screens/my_page.ts
export const BUTTON = '[data-test-subj="myButton"]';
export const INPUT = '[data-test-subj="myInput"]';

// Scout page_objects/my_page.ts
export class MyPage {
  public button: Locator;
  public input: Locator;

  constructor(private readonly page: ScoutPage) {
    this.button = this.page.testSubj.locator('myButton');
    this.input = this.page.testSubj.locator('myInput');
  }
}
\`\`\`

**Cypress tasks** (action functions) → Scout page object **methods**:

\`\`\`typescript
// Cypress tasks/my_page.ts
export const clickButton = () => {
  cy.get(BUTTON).click();
};

// Scout page_objects/my_page.ts
export class MyPage {
  async clickButton() {
    await this.button.click();
  }
}
\`\`\`

## Test Structure Conversion

\`\`\`typescript
// Cypress
describe('My Feature', { tags: ['@ess'] }, () => {
  beforeEach(() => {
    login('admin');
    cy.visit('/app/security');
  });

  it('should work', () => {
    cy.get('[data-test-subj="button"]').click();
    cy.get('[data-test-subj="result"]').should('be.visible');
  });
});

// Scout
test.describe('My Feature', { tag: ['@ess'] }, () => {
  test.beforeEach(async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('security');
  });

  test('should work', async ({ page }) => {
    await page.testSubj.click('button');
    await expect(page.testSubj.locator('result')).toBeVisible();
  });
});
\`\`\`
`;

export const COMMON_PITFALLS = `
# Common Migration Pitfalls

## 1. Forgetting await

❌ **Wrong**: \`pageObjects.myPage.navigate();\`
✅ **Correct**: \`await pageObjects.myPage.navigate();\`

## 2. Using Cypress chaining patterns

❌ **Wrong**:
\`\`\`typescript
element.click().then(() => {
  expect(result).toBeVisible();
});
\`\`\`

✅ **Correct**:
\`\`\`typescript
await element.click();
await expect(result).toBeVisible();
\`\`\`

## 3. Not making data unique

❌ **Wrong**: \`const name = 'Test Item';\`
✅ **Correct**: \`const name = \`Test_\${scoutSpace.id}_\${Date.now()}\`;\`

## 4. Using page objects for API setup

❌ **Wrong**: \`await pageObjects.rulesPage.createRule();\`
✅ **Correct**: \`await apiServices.detectionRule.create();\`

## 5. Creating rules before data

❌ **Wrong**:
\`\`\`typescript
await createRule();
await indexData();
\`\`\`

✅ **Correct**:
\`\`\`typescript
await indexData();
await createRule();
await waitForRuleExecution();
\`\`\`

## 6. Missing deployment tags

❌ **Wrong**: \`test.describe('My Feature', () => {})\`
✅ **Correct**: \`test.describe('My Feature', { tag: ['@ess'] }, () => {})\`

## 7. Using hard waits

❌ **Wrong**: \`await page.waitForTimeout(2000);\`
✅ **Correct**: \`await expect(element).toBeVisible();\`

## 8. Incorrect selector conversion

❌ **Wrong**: \`page.locator('[data-test-subj="x"]')\`
✅ **Correct**: \`page.testSubj.locator('x')\`

## 9. Not handling onboarding modals

❌ **Wrong**: Ignore modals and let test fail
✅ **Correct**:
\`\`\`typescript
await page.getByRole('button', { name: 'Close tour' })
  .click({ timeout: 1000 })
  .catch(() => {});
\`\`\`

## 10. Missing cleanup

❌ **Wrong**: No cleanup in beforeEach/afterEach
✅ **Correct**:
\`\`\`typescript
beforeEach(async ({ apiServices }) => {
  await apiServices.items.deleteAll();
});
\`\`\`
`;
