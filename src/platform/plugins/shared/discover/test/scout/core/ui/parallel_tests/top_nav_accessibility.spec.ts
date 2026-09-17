/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Top-nav overlays return focus to the button that opened them.
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../common/ui/fixtures';

const focusAndPress = async (page: ScoutPage, testSubj: string) => {
  const button = page.testSubj.locator(testSubj);
  await button.focus();
  await page.keyboard.press('Enter');
};

spaceTest.describe('top nav accessibility', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'returns focus to Open after dismissing the open-search flyout',
    async ({ page, pageObjects }) => {
      const overflowButton = page.testSubj.locator('app-menu-overflow-button');
      const loadSearchForm = page.testSubj.locator('loadSearchForm');
      const closeButton = page.testSubj.locator('euiFlyoutCloseButton');

      await pageObjects.discover.clickAppMenuItem('discoverOpenButton');
      await expect(loadSearchForm).toBeVisible();
      await expect(closeButton).toBeVisible();

      await closeButton.click();
      await expect(loadSearchForm).toBeHidden();
      await expect(overflowButton).toBeFocused();
    }
  );

  spaceTest('returns focus to overflow after dismissing the overflow menu', async ({ page }) => {
    await focusAndPress(page, 'app-menu-overflow-button');
    await expect(page.testSubj.locator('discoverAlertsButton')).not.toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.testSubj.locator('app-menu-overflow-button')).toBeFocused();
  });

  spaceTest(
    'returns focus to Alerts after dismissing the create-rule flyout',
    async ({ page, pageObjects }) => {
      await pageObjects.discover.openSearchThresholdRuleFlyout();

      const closeButton = page.testSubj.locator('euiFlyoutCloseButton');
      await expect(closeButton).toBeVisible();
      await closeButton.click();
      await expect(closeButton).toBeHidden();
      await expect(page.testSubj.locator('app-menu-overflow-button')).toBeFocused();
    }
  );

  spaceTest('returns focus to Share after dismissing the share popover', async ({ page }) => {
    await focusAndPress(page, 'shareTopNavButton');
    await expect(page.testSubj.locator('shareTopNavButton')).not.toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.testSubj.locator('shareTopNavButton')).toBeFocused();
  });

  spaceTest('returns focus to Save after dismissing the save modal', async ({ page }) => {
    await focusAndPress(page, 'discoverSaveButton');
    await expect(page.testSubj.locator('discoverSaveButton')).not.toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.testSubj.locator('discoverSaveButton')).toBeFocused();
  });
});
