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

test.describe('Error Boundary Examples', { tag: ['@local-stateful-classic'] }, () => {
  test.beforeEach(async ({ browserAuth, page }) => {
    await browserAuth.loginAsViewer();
    await page.gotoApp('errorBoundaryExample');
    await expect(page.testSubj.locator('errorBoundaryExampleHeader')).toBeVisible();
  });

  test('fatal error shows error boundary and recovers on reload', async ({ page }) => {
    await page.testSubj.locator('fatalErrorBtn').click();

    await expect(page.testSubj.locator('errorBoundaryFatalHeader')).toBeVisible();
    await expect(page.testSubj.locator('errorBoundaryExampleHeader')).toHaveCount(0);

    await page.testSubj.locator('errorBoundaryFatalShowDetailsBtn').click();
    await expect(page.testSubj.locator('errorBoundaryFatalDetailsErrorString')).toContainText(
      'Error: Example of unknown error type'
    );

    await page.testSubj.locator('euiFlyoutCloseButton').click();
    await page.testSubj.locator('errorBoundaryFatalPromptReloadBtn').click();

    await expect(page.testSubj.locator('errorBoundaryExampleHeader')).toBeVisible();
  });

  test('recoverable error shows error boundary and recovers on reload', async ({ page }) => {
    await page.testSubj.locator('recoverableErrorBtn').click();

    await expect(page.testSubj.locator('errorBoundaryRecoverableHeader')).toBeVisible();
    await expect(page.testSubj.locator('errorBoundaryExampleHeader')).toHaveCount(0);

    await page.testSubj.locator('errorBoundaryRecoverablePromptReloadBtn').click();

    await expect(page.testSubj.locator('errorBoundaryExampleHeader')).toBeVisible();
  });
});
