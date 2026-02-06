/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

test.describe('Flyout System - EuiFlyout component', { tag: ['@ess'] }, () => {
  test.beforeEach(async ({ browserAuth, page }) => {
    await browserAuth.loginAsViewer();
    await page.gotoApp('flyoutSystemExamples');
  });

  test('Session J: open main flyout, open child flyout A, both remain visible', async ({
    page,
  }) => {
    // 1. Click "Open Session J"
    await page.testSubj.locator('openMainFlyoutComponentButton-Session J').click();

    // 2. Verify main flyout is visible
    const mainFlyout = page.locator('#mainFlyout-Session\\ J');
    await expect(mainFlyout).toBeVisible();

    // 3. Click "Open child flyout A" inside the main flyout
    await page.testSubj.locator('openChildFlyoutComponentAButton-Session J').click();

    // 4. Verify child flyout A is visible with correct heading
    const childFlyoutA = page.locator('#childFlyout-Session\\ J-a');
    await expect(childFlyoutA).toBeVisible();
    await expect(childFlyoutA.getByRole('heading', { name: 'Session J - Child A' })).toBeVisible();

    // 5. Verify main flyout is still visible
    await expect(mainFlyout).toBeVisible();

    // 6. Click the "Close this dialog" button in the main flyout menu
    await mainFlyout.locator('[data-test-subj="euiFlyoutCloseButton"]').click();

    // 7. Verify all flyouts have been removed from the DOM
    await expect(mainFlyout).toHaveCount(0);
    await expect(childFlyoutA).toHaveCount(0);
  });
});
