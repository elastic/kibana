/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Test Writing Patterns from security-scout-tests branch
 *
 * These patterns represent best practices observed in real-world Scout tests.
 */

export const TEST_PATTERNS = `
# Scout Test Writing Patterns

## Test Organization Best Practices

### 1. Use spaceTest for Parallel Execution

\`\`\`typescript
import { expect, spaceTest } from '@kbn/scout-security';

spaceTest.describe('My Feature', { tag: ['@ess', '@svlSecurity'] }, () => {
  spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
    await browserAuth.loginAsAdmin();
    await apiServices.myFeature.deleteAll();
  });

  spaceTest('should work correctly', async ({ page, pageObjects, scoutSpace }) => {
    // Test implementation with space isolation
    const uniqueName = \`Test_\${scoutSpace.id}_\${Date.now()}\`;
    // ...
  });
});
\`\`\`

### 2. Deployment Tags

Always specify deployment tags in test.describe:

\`\`\`typescript
// For ESS only
spaceTest.describe('ESS Only Feature', { tag: ['@ess'] }, () => {});

// For Serverless Security only
spaceTest.describe('Serverless Feature', { tag: ['@svlSecurity'] }, () => {});

// For both ESS and Serverless
spaceTest.describe('Universal Feature', { tag: ['@ess', '@svlSecurity'] }, () => {});

// For all deployments
test.describe('Deployment Agnostic', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {});
\`\`\`

### 3. Unique Data Naming

Make test data unique to avoid conflicts in parallel execution:

\`\`\`typescript
spaceTest('creates unique rule', async ({ apiServices, scoutSpace }) => {
  const ruleName = \`Rule_\${scoutSpace.id}_\${Date.now()}\`;
  const rule = {
    ...CUSTOM_QUERY_RULE,
    name: ruleName,
    rule_id: \`rule_\${scoutSpace.id}\`,
  };
  await apiServices.detectionRule.createCustomQueryRule(rule);
});
\`\`\`

### 4. Data Generation BEFORE Rule Creation

Critical timing pattern: Index test data BEFORE creating detection rules:

\`\`\`typescript
spaceTest.beforeEach(async ({ apiServices, scoutSpace }) => {
  // FIRST: Generate test data
  await apiServices.detectionRule.indexTestDocument('logs-test', {
    'event.category': 'security',
    'event.type': 'alert',
    message: 'Test security event',
  });

  // THEN: Create rule that will match the already-indexed document
  const rule = {
    ...CUSTOM_QUERY_RULE,
    name: \`Rule_\${scoutSpace.id}_\${Date.now()}\`,
    from: 'now-1m', // Look for data from last minute
    enabled: true,
  };
  await apiServices.detectionRule.createCustomQueryRule(rule);

  // FINALLY: Wait for rule execution
  await apiServices.detectionRule.waitForRuleExecution(rule.rule_id);
});
\`\`\`

### 5. Comprehensive Cleanup

Clean in BOTH beforeEach (for fresh state) and afterEach (for teardown):

\`\`\`typescript
spaceTest.beforeEach(async ({ apiServices }) => {
  await apiServices.connectors.deleteAll();
  await apiServices.assistant.deleteAllConversations();
  await apiServices.detectionRule.deleteAll();
  await apiServices.detectionRule.deleteAllAlerts();
  await apiServices.detectionRule.cleanupTestData('logs-*');
});

spaceTest.afterEach(async ({ apiServices }) => {
  // Same cleanup for safety
  await apiServices.connectors.deleteAll();
  await apiServices.assistant.deleteAllConversations();
  await apiServices.detectionRule.deleteAll();
  await apiServices.detectionRule.deleteAllAlerts();
  await apiServices.detectionRule.cleanupTestData('logs-*');
});
\`\`\`

### 6. Wait Strategies

Use centralized TIMEOUTS and proper wait conditions:

\`\`\`typescript
import { TIMEOUTS } from '@kbn/scout-security';

// Wait for element with standard timeout
await element.waitFor({ state: 'visible', timeout: TIMEOUTS.UI_ELEMENT_STANDARD });

// Wait with timeout handling
await pageObjects.assistantPage.locators.connectorSelector
  .waitFor({ state: 'visible', timeout: TIMEOUTS.UI_ELEMENT_STANDARD })
  .catch(() => {
    // Handle timeout gracefully
  });

// Wait for async operations
await expect(element).toBeVisible({ timeout: TIMEOUTS.UI_ELEMENT_EXTRA_LONG });
\`\`\`

### 7. API Services for Setup

Use API services for data setup, NOT page objects:

\`\`\`typescript
spaceTest.beforeEach(async ({ apiServices, browserScopedApis, scoutSpace }) => {
  // API Service (worker-scoped)
  await apiServices.connectors.createAzureOpenAI();
  await apiServices.detectionRule.createCustomQueryRule(rule);

  // Browser-scoped API (for browser-specific data)
  await browserScopedApis.assistant.createConversation({
    title: \`Conversation_\${scoutSpace.id}_\${Date.now()}\`,
    messages: [],
  });
});
\`\`\`

### 8. Page Objects for UI Interactions

Use page objects ONLY for UI interactions in tests:

\`\`\`typescript
spaceTest('user interaction test', async ({ pageObjects, page }) => {
  // Navigate using page object
  await pageObjects.rulesManagementPage.navigation.navigateAndDismissOnboarding();

  // Interact using page object
  await pageObjects.rulesManagementPage.selection.selectRuleByCheckbox(ruleId);
  await pageObjects.rulesManagementPage.ruleActions.toggleRuleSwitch(0);

  // Assertions using page object
  await pageObjects.rulesManagementPage.assertions.expectRuleVisible(ruleName);
});
\`\`\`

### 9. Onboarding Tour Dismissal

Always dismiss onboarding modals that may block interactions:

\`\`\`typescript
async dismissOnboardingTour() {
  await this.page
    .getByRole('button', { name: 'Close tour' })
    .click({ timeout: TIMEOUTS.UI_ELEMENT_STANDARD })
    .catch(() => {
      // Modal not present, continue silently
    });
}
\`\`\`

### 10. Force Click for Overlapping Elements

Use force click when toasts or overlays block interactions:

\`\`\`typescript
async openFromRule() {
  await this.dismissOnboardingTour();
  await this.locators.chatIcon.waitFor({ state: 'visible' });
  // Use force click to bypass toasts that may block the button
  // This is a known issue - toasts can block UI elements
  // eslint-disable-next-line playwright/no-force-option
  await this.locators.chatIcon.click({ force: true });
}
\`\`\`

### 11. Sequential Tests for Dependencies

Use .serial for tests that must run in order:

\`\`\`typescript
spaceTest.describe.serial(
  'AI Assistant Conversations - Changing conversations',
  { tag: ['@ess', '@svlSecurity'] },
  () => {
    // Tests that depend on previous test state
  }
);
\`\`\`

### 12. Test Timeouts for Slow Operations

Increase timeout for tests with AI responses or async operations:

\`\`\`typescript
spaceTest('slow AI operation', async ({ pageObjects }, testInfo) => {
  // Increase timeout for this test
  testInfo.setTimeout(120000); // 2 minutes

  // AI responses in serverless can be slow
  await pageObjects.assistantPage.messaging.typeAndSendMessage('hello');
  await pageObjects.assistantPage.assertions.expectErrorResponse();
});
\`\`\`

## Common Anti-Patterns to Avoid

❌ **DON'T** forget await:
\`\`\`typescript
pageObjects.myPage.navigate(); // WRONG
\`\`\`

❌ **DON'T** use hard waits:
\`\`\`typescript
await page.waitForTimeout(2000); // WRONG
\`\`\`

❌ **DON'T** share data between parallel tests:
\`\`\`typescript
const name = 'Test Item'; // WRONG - conflicts in parallel
\`\`\`

❌ **DON'T** create rules before data:
\`\`\`typescript
await createRule(); // WRONG
await indexData(); // Data won't match
\`\`\`

❌ **DON'T** use page objects in beforeEach for setup:
\`\`\`typescript
await pageObjects.myPage.createItem(); // WRONG - use apiServices
\`\`\`

✅ **DO** use API services for setup:
\`\`\`typescript
await apiServices.myFeature.create(); // CORRECT
\`\`\`
`;

export const FIXTURE_PATTERNS = `
# Scout Fixture Patterns

## Worker-Scoped vs Test-Scoped Fixtures

### Worker-Scoped Fixtures (apiServices)
Use for shared data across all tests in a worker:

\`\`\`typescript
spaceTest.beforeAll(async ({ apiServices }) => {
  // Data shared by all tests in this worker
  await apiServices.items.createBulk(sharedItems);
});
\`\`\`

### Test-Scoped Fixtures
Use for test-specific data:

\`\`\`typescript
spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
  await browserAuth.loginAsAdmin();
  await apiServices.items.create({ name: \`Test_\${scoutSpace.id}\` });
});
\`\`\`

## Available Fixtures

### Browser Auth
\`\`\`typescript
await browserAuth.loginAsAdmin();
await browserAuth.loginAsPlatformEngineer();
await browserAuth.loginAsViewer();
\`\`\`

### Page Objects
\`\`\`typescript
await pageObjects.alertsTablePage.navigate();
await pageObjects.assistantPage.open();
await pageObjects.rulesManagementPage.navigation.navigateAndDismissOnboarding();
\`\`\`

### API Services
\`\`\`typescript
await apiServices.detectionRule.createCustomQueryRule(rule);
await apiServices.detectionRule.waitForRuleExecution(ruleId);
await apiServices.connectors.createAzureOpenAI();
await apiServices.assistant.deleteAllConversations();
\`\`\`

### Browser-Scoped APIs
\`\`\`typescript
await browserScopedApis.assistant.createConversation({ title, messages });
\`\`\`

### Scout Space
\`\`\`typescript
const uniqueId = scoutSpace.id;
const name = \`Item_\${scoutSpace.id}_\${Date.now()}\`;
\`\`\`
`;
