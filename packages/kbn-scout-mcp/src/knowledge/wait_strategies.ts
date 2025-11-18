/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Wait Strategies and TIMEOUTS Patterns
 */

export const WAIT_STRATEGIES = `
# Wait Strategies in Scout Tests

## Centralized TIMEOUTS Constants

Scout uses centralized timeout constants for consistency:

\`\`\`typescript
import { TIMEOUTS } from '@kbn/scout-security';

// Available timeouts
TIMEOUTS.UI_ELEMENT_STANDARD      // 10 seconds
TIMEOUTS.UI_ELEMENT_EXTRA_LONG    // 30 seconds
TIMEOUTS.API_CALL                 // 15 seconds
TIMEOUTS.RULE_EXECUTION           // 60 seconds
\`\`\`

## Wait for Element Visibility

\`\`\`typescript
// Wait for element to be visible
await element.waitFor({
  state: 'visible',
  timeout: TIMEOUTS.UI_ELEMENT_STANDARD
});

// Or use expect
await expect(element).toBeVisible({
  timeout: TIMEOUTS.UI_ELEMENT_STANDARD
});
\`\`\`

## Wait for Element State

\`\`\`typescript
// Wait for visible
await element.waitFor({ state: 'visible' });

// Wait for hidden
await element.waitFor({ state: 'hidden' });

// Wait for attached (exists in DOM)
await element.waitFor({ state: 'attached' });

// Wait for detached (removed from DOM)
await element.waitFor({ state: 'detached' });
\`\`\`

## Wait with Timeout Handling

For optional elements that may not appear:

\`\`\`typescript
await element
  .waitFor({ state: 'visible', timeout: TIMEOUTS.UI_ELEMENT_STANDARD })
  .catch(() => {
    // Element not present, continue silently
  });
\`\`\`

## Wait for URL

\`\`\`typescript
await page.waitForURL('**/app/security/alerts**');
\`\`\`

## Wait for Network Response

\`\`\`typescript
// Wait for specific API call
const responsePromise = page.waitForResponse(
  (response) => response.url().includes('/api/detection_engine/rules')
);
await button.click();
const response = await responsePromise;

// Check response
expect(response.status()).toBe(200);
\`\`\`

## Wait for Condition

\`\`\`typescript
// Wait for element count
await expect(elements).toHaveCount(5);

// Wait for text content
await expect(element).toHaveText('Expected Text');

// Wait for text to contain
await expect(element).toContainText('Partial');

// Wait for value
await expect(input).toHaveValue('text');
\`\`\`

## Wait for Page Load

\`\`\`typescript
// Wait for load state
await page.waitForLoadState('domcontentloaded');
await page.waitForLoadState('networkidle');
\`\`\`

## Wait for Test-Specific Conditions

\`\`\`typescript
// Wait for alerts table to load
await pageObjects.alertsTablePage.waitForAlertsToLoad();

// Wait for detections wrapper with rule name
await pageObjects.alertsTablePage.waitForDetectionsAlertsWrapper(ruleName);

// Wait for rule execution
await apiServices.detectionRule.waitForRuleExecution(ruleId);
\`\`\`

## Complex Wait with Multiple Conditions

\`\`\`typescript
// Wait for conversation to fully load before checking state
await pageObjects.assistantPage.locators.connectorSelector
  .waitFor({ state: 'visible', timeout: TIMEOUTS.UI_ELEMENT_STANDARD })
  .catch(() => {
    // Ignore timeout - continue anyway
  });

// Then check state
await pageObjects.assistantPage.assertions.expectConnectorSelected(connectorName);
\`\`\`

## Wait for Empty State to Disappear

\`\`\`typescript
// Wait for data to load by checking empty state disappears
const emptyState = page.testSubj.locator('emptyState');
const isEmptyVisible = await emptyState.isVisible({ timeout: 1000 }).catch(() => false);

if (isEmptyVisible) {
  // Wait for empty state to disappear (data has loaded)
  await expect(emptyState).not.toBeVisible({ timeout: 20_000 });
}
\`\`\`

## Wait for Specific Text in Element

\`\`\`typescript
// Wait for rule name to appear in table
await alertsTable
  .getByText(ruleName)
  .waitFor({ state: 'visible', timeout: 20_000 });
\`\`\`

## Avoid Hard Waits

❌ **Don't use**:
\`\`\`typescript
await page.waitForTimeout(2000); // Bad practice
\`\`\`

✅ **Use instead**:
\`\`\`typescript
await expect(element).toBeVisible(); // Waits up to default timeout
\`\`\`

## Test Timeout Extension

For slow operations (AI responses, large data loads):

\`\`\`typescript
test('slow operation', async ({ pageObjects }, testInfo) => {
  // Increase timeout for entire test
  testInfo.setTimeout(120000); // 2 minutes

  // AI responses can be slow
  await pageObjects.assistantPage.messaging.typeAndSendMessage('hello');
  await pageObjects.assistantPage.assertions.expectErrorResponse();
});
\`\`\`

## Wait Strategies by Scenario

### Scenario: Element May or May Not Appear

\`\`\`typescript
async dismissOnboardingModal() {
  await page
    .getByRole('button', { name: 'Close tour' })
    .click({ timeout: TIMEOUTS.UI_ELEMENT_STANDARD })
    .catch(() => {
      // Modal not present, continue
    });
}
\`\`\`

### Scenario: Wait for Table Data

\`\`\`typescript
// Wait for table to load
await page.testSubj.locator('tableLoaded').waitFor({ state: 'visible' });

// Wait for specific row
await page.getByText(uniqueId).waitFor({ state: 'visible' });
\`\`\`

### Scenario: Wait for Multiple Elements

\`\`\`typescript
// Use Promise.all for parallel waits
await Promise.all([
  element1.waitFor({ state: 'visible' }),
  element2.waitFor({ state: 'visible' }),
  element3.waitFor({ state: 'visible' }),
]);
\`\`\`

### Scenario: Poll for Condition

\`\`\`typescript
// Wait for rule execution with polling
async waitForRuleExecution(ruleId: string, maxWaitMs: number = 60000) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const status = await this.getRuleStatus(ruleId);
    if (status === 'succeeded') {
      return;
    }
    await page.waitForTimeout(1000); // Poll every second
  }
  throw new Error(\`Rule \${ruleId} did not execute within \${maxWaitMs}ms\`);
}
\`\`\`

### Scenario: Wait for Animation to Complete

\`\`\`typescript
// Wait for element to be stable (not animating)
await expect(element).toBeVisible();
await element.waitFor({ state: 'visible' });
// Playwright automatically waits for actionability
await element.click(); // Will wait for element to be stable
\`\`\`

## Best Practices

1. ✅ Use semantic waits (\`expect().toBeVisible()\`) over hard waits
2. ✅ Use centralized TIMEOUTS constants
3. ✅ Handle optional elements with .catch()
4. ✅ Wait for specific conditions, not arbitrary time
5. ✅ Use appropriate timeouts for different operations
6. ✅ Extend test timeout for known slow operations
7. ❌ Avoid \`waitForTimeout()\` except for polling
8. ❌ Don't use arbitrary timeout values - use constants
`;
