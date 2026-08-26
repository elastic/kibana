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

spaceTest.describe('Discover tabs - keyboard', { tag: '@local-stateful-classic' }, () => {
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

  spaceTest('navigates and closes tabs with keyboard', async ({ page, pageObjects }) => {
    const { discover, unifiedTabs } = pageObjects;

    await unifiedTabs.createNewTab();
    await discover.waitUntilTabIsLoaded();
    await expect(unifiedTabs.getTabs()).toHaveCount(2);

    const activeTab = unifiedTabs.getTabs().and(page.locator('[aria-selected="true"]'));
    await activeTab.focus();

    await page.keyboard.press('ArrowLeft');
    expect(await unifiedTabs.getSelectedTabLabel()).not.toBe('');
    const afterLeft = await unifiedTabs.getSelectedTabLabel();

    await page.keyboard.press('ArrowRight');
    expect(await unifiedTabs.getSelectedTabLabel()).not.toBe(afterLeft);

    await page.keyboard.press('Delete');
    await expect(unifiedTabs.getTabs()).toHaveCount(1);
  });

  spaceTest('reorders tabs with keyboard', async ({ page, pageObjects }) => {
    const { discover, unifiedTabs } = pageObjects;

    await unifiedTabs.createNewTab();
    await discover.waitUntilTabIsLoaded();
    await unifiedTabs.createNewTab();
    await discover.waitUntilTabIsLoaded();
    await expect(unifiedTabs.getTabs()).toHaveCount(3);

    const before = await unifiedTabs.getTabLabels();

    const activeTab = unifiedTabs.getTabs().and(page.locator('[aria-selected="true"]'));
    await activeTab.focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Space');

    expect(await unifiedTabs.getTabLabels()).toStrictEqual([before[0], before[2], before[1]]);
  });
});
