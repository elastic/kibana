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

test.describe('Flyout System - EuiFlyout component', { tag: ['@local-stateful-classic'] }, () => {
  test.beforeEach(async ({ browserAuth, page }) => {
    await browserAuth.loginAsViewer();
    await page.gotoApp('flyoutSystemExamples');
  });

  test('Session J: open main flyout, open child flyout A, both remain visible', async ({
    page,
  }) => {
    await page.testSubj.locator('openMainFlyoutComponentButton-Session J').click();

    const mainFlyout = page.locator('#mainFlyout-Session\\ J');
    await expect(mainFlyout).toBeVisible();

    await page.testSubj.locator('openChildFlyoutComponentAButton-Session J').click();

    const childFlyoutA = page.locator('#childFlyout-Session\\ J-a');
    await expect(childFlyoutA).toBeVisible();
    await expect(childFlyoutA.getByRole('heading', { name: 'Session J - Child A' })).toBeVisible();

    await expect(mainFlyout).toBeVisible();

    await mainFlyout.locator('[data-test-subj="euiFlyoutCloseButton"]').click();

    await expect(mainFlyout).toHaveCount(0);
    await expect(childFlyoutA).toHaveCount(0);
    throw new Error(`Failure to ensure new config and new tests are running in CI.`);
  });

  test('Back button: navigate from Session X overlay back to Session J push flyout', async ({
    page,
  }) => {
    await page.testSubj.locator('flyoutTypeSwitch-Session J').click();

    await page.testSubj.locator('openMainFlyoutComponentButton-Session J').click();
    const sessionJFlyout = page.locator('#mainFlyout-Session\\ J');
    await expect(sessionJFlyout).toBeVisible();

    await page.testSubj.locator('openMainFlyoutOverlaysButton-Session X').click();
    const sessionXFlyout = page.locator('#mainFlyout-Session\\ X');
    await expect(sessionXFlyout).toBeVisible();

    await expect(sessionXFlyout).toHaveCount(1);
    await expect(sessionJFlyout).toHaveCount(1);

    await sessionXFlyout.getByRole('button', { name: 'Back' }).click();

    await expect(sessionJFlyout).toHaveCount(1);
    await expect(sessionXFlyout).toHaveCount(0);

    await sessionJFlyout.locator('[data-test-subj="euiFlyoutCloseButton"]').click();

    await expect(sessionJFlyout).toHaveCount(0);
    throw new Error(`Failure to ensure new config and new tests are running in CI.`);
  });
});
