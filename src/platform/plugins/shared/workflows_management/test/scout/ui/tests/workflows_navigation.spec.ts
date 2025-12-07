/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect, test } from '../fixtures';

test.describe('Workflows Navigation', { tag: ['@ess', '@svlSecurity'] }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    // Enable workflows UI setting
    await kbnClient.request({
      method: 'POST',
      path: '/internal/kibana/settings',
      body: {
        changes: {
          'workflows:ui:enabled': true,
        },
      },
    });
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test('should navigate to workflows page and display UI', async ({ page }) => {
    // Navigate to workflows app
    await page.gotoApp('workflows');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify workflows page loaded by checking for main heading
    await expect(page.getByRole('heading', { name: /workflows/i, level: 1 })).toBeVisible();

    // Verify either "Create a new workflow" button or workflows content exists
    const createButton = page.getByRole('button', { name: /create a new workflow/i });
    await expect(createButton.first()).toBeVisible();
  });

  test('should display workflows page elements', async ({ page }) => {
    await page.gotoApp('workflows');
    await page.waitForLoadState('networkidle');

    // Check that main content is visible
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();

    // Verify "Get Started with Workflows" or workflow list is present
    const getStartedHeading = page.getByRole('heading', { name: /get started with workflows/i });
    const workflowsHeading = page.getByRole('heading', { name: /workflows/i, level: 1 });
    
    // At least one should be visible
    await expect(getStartedHeading.or(workflowsHeading)).toBeVisible();
  });
});

