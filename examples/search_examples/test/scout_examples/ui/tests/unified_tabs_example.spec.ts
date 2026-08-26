/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const INITIAL_TAB_COUNT = 7;

test.describe('Unified tabs examples', { tag: '@local-stateful-classic' }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.uiSettings.update({ defaultIndex: 'logstash-*' });
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.uiSettings.unset('defaultIndex');
  });

  test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await page.gotoApp('unifiedTabsExamples');
    await expect(pageObjects.unifiedTabs.getTabs()).toHaveCount(INITIAL_TAB_COUNT);
  });

  test('creates, selects, and closes tabs', async ({ page, pageObjects }) => {
    const { unifiedTabs } = pageObjects;

    await unifiedTabs.createNewTab();
    await expect(unifiedTabs.getTabs()).toHaveCount(INITIAL_TAB_COUNT + 1);

    await unifiedTabs.selectTab(0);
    expect(await unifiedTabs.getSelectedTabLabel()).not.toBe('');

    // Close the selected tab. `closeTab(index)` hovers another tab first, which
    // opens this example's mock preview and intercepts the close control.
    const activeTabTestSubj = await unifiedTabs.getActiveTabTestSubj();
    const tabId = activeTabTestSubj.slice('unifiedTabs_selectTabBtn_'.length);
    await page.testSubj.locator(`unifiedTabs_closeTabBtn_${tabId}`).click();
    await expect(unifiedTabs.getTabs()).toHaveCount(INITIAL_TAB_COUNT);
  });

  test('navigates and reorders tabs with keyboard', async ({ page, pageObjects }) => {
    const { unifiedTabs } = pageObjects;

    await unifiedTabs.createNewTab();
    await expect(unifiedTabs.getTabs()).toHaveCount(INITIAL_TAB_COUNT + 1);

    const activeTab = unifiedTabs.getTabs().and(page.locator('[aria-selected="true"]'));
    await activeTab.focus();

    await page.keyboard.press('ArrowLeft');
    const afterLeft = await unifiedTabs.getSelectedTabLabel();
    expect(afterLeft).not.toBe('');

    await page.keyboard.press('ArrowRight');
    expect(await unifiedTabs.getSelectedTabLabel()).not.toBe(afterLeft);

    await page.keyboard.press('Delete');
    await expect(unifiedTabs.getTabs()).toHaveCount(INITIAL_TAB_COUNT);

    await unifiedTabs.createNewTab();
    await unifiedTabs.createNewTab();
    await expect(unifiedTabs.getTabs()).toHaveCount(INITIAL_TAB_COUNT + 2);

    const before = await unifiedTabs.getTabLabels();

    await unifiedTabs.getTabs().and(page.locator('[aria-selected="true"]')).focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Space');

    expect(await unifiedTabs.getTabLabels()).toStrictEqual([
      ...before.slice(0, -2),
      before[before.length - 1],
      before[before.length - 2],
    ]);
  });
});
