/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

spaceTest.describe('Console tab navigation', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.console.goto();
    await pageObjects.console.skipTourIfExists();
  });

  spaceTest('selecting a tab updates the URL', async ({ page, pageObjects }) => {
    await spaceTest.step('the Shell tab is the entry point', async () => {
      await expect(pageObjects.console.shellPanel).toBeVisible();
      expect(page.url()).toContain('/shell');
    });

    await spaceTest.step('selecting History', async () => {
      await pageObjects.console.openHistoryTab();
      expect(page.url()).toContain('/history');
    });

    await spaceTest.step('selecting Config', async () => {
      await pageObjects.console.openConfigTab();
      expect(page.url()).toContain('/config');
    });
  });

  spaceTest('tabs are reachable through the URL', async ({ page, pageObjects }) => {
    const shellTabUrl = page.url();

    await spaceTest.step('navigating to History', async () => {
      await page.goto(shellTabUrl.replace('/shell', '/history'));
      await expect(pageObjects.console.historyPanel).toBeVisible();
      expect(page.url()).toContain('/history');
    });

    await spaceTest.step('navigating to Config', async () => {
      await page.goto(shellTabUrl.replace('/shell', '/config'));
      await expect(pageObjects.console.configPanel).toBeVisible();
      expect(page.url()).toContain('/config');
    });

    await spaceTest.step('navigating back to Shell', async () => {
      await page.goto(shellTabUrl);
      await expect(pageObjects.console.shellPanel).toBeVisible();
      expect(page.url()).toContain('/shell');
    });
  });
});
