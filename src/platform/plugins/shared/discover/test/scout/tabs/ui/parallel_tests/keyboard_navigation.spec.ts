/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

spaceTest.describe(
  'Discover tabs - keyboard navigation and reorder',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest('navigates and reorders tabs with the keyboard', async ({ page, pageObjects }) => {
      const { discover, unifiedTabs } = pageObjects;

      await spaceTest.step('create a tab and move between tabs with arrow keys', async () => {
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await expect(unifiedTabs.getTabs()).toHaveCount(2);

        const selectedBefore = await unifiedTabs.getSelectedTabLabel();
        await unifiedTabs.getActiveTab().focus();
        await page.keyboard.press('ArrowLeft');
        await expect(unifiedTabs.getActiveTab()).not.toHaveText(selectedBefore);

        await page.keyboard.press('ArrowRight');
        await expect(unifiedTabs.getActiveTab()).toHaveText(selectedBefore);
      });

      await spaceTest.step('close the selected tab with Delete', async () => {
        await page.keyboard.press('Delete');
        await expect(unifiedTabs.getTabs()).toHaveCount(1);
        await discover.waitUntilTabIsLoaded();
      });

      await spaceTest.step('reorder tabs with Space and arrow keys', async () => {
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await expect(unifiedTabs.getTabs()).toHaveCount(3);

        const before = await unifiedTabs.getTabLabels();

        await unifiedTabs.getActiveTab().focus();
        await page.keyboard.press('Space');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('Space');

        await expect(unifiedTabs.getTabs()).toHaveText([
          ...before.slice(0, -2),
          before[before.length - 1],
          before[before.length - 2],
        ]);
      });
    });
  }
);
