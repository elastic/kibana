/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../fixtures/common';

const expectAvailableFieldCount = async (page: ScoutPage, count: number) => {
  await expect(page.testSubj.locator('fieldListGroupedAvailableFields-count')).toHaveText(
    count.toString()
  );
};

const clearSidebarFieldSearch = async (page: ScoutPage) => {
  await page.testSubj.locator('fieldListFiltersFieldSearch').fill('');
};

const openSidebarFieldTypeFilter = async (page: ScoutPage) => {
  await page.testSubj.locator('fieldListFiltersFieldTypeFilterToggle').click();
  await page.testSubj
    .locator('fieldListFiltersFieldTypeFilterOptions')
    .waitFor({ state: 'visible' });
};

const closeSidebarFieldTypeFilter = async (page: ScoutPage) => {
  await page.testSubj.locator('fieldListFiltersFieldTypeFilterToggle').click();
  await page.testSubj
    .locator('fieldListFiltersFieldTypeFilterOptions')
    .waitFor({ state: 'hidden' });
};

const clearSidebarFieldTypeFilters = async (page: ScoutPage) => {
  await openSidebarFieldTypeFilter(page);
  await page.testSubj.locator('fieldListFiltersFieldTypeFilterClearAll').click();
  await closeSidebarFieldTypeFilter(page);
};

spaceTest.describe(
  'Discover tabs - restorable sidebar state',
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

    spaceTest('restores sidebar collapsible state per tab', async ({ pageObjects }) => {
      const { discover, unifiedTabs } = pageObjects;

      expect(await discover.isSidebarPanelOpen()).toBe(true);

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      expect(await discover.isSidebarPanelOpen()).toBe(true);

      await discover.closeSidebar();
      expect(await discover.isSidebarPanelOpen()).toBe(false);

      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      expect(await discover.isSidebarPanelOpen()).toBe(true);

      await unifiedTabs.selectTab(1);
      await discover.waitUntilTabIsLoaded();
      expect(await discover.isSidebarPanelOpen()).toBe(false);
    });

    spaceTest('restores sidebar width per tab', async ({ pageObjects }) => {
      const { discover, unifiedTabs } = pageObjects;
      const initialWidth = await discover.getSidebarWidth();

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getSidebarWidth()).toBe(initialWidth);

      await discover.resizeSidebarBy(100);
      const updatedWidth = await discover.getSidebarWidth();
      expect(updatedWidth).toBeGreaterThan(initialWidth);

      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getSidebarWidth()).toBe(initialWidth);

      await unifiedTabs.selectTab(1);
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getSidebarWidth()).toBe(updatedWidth);
    });

    spaceTest('restores sidebar field filters per tab', async ({ page, pageObjects }) => {
      const { discover, unifiedFieldList, unifiedTabs } = pageObjects;
      const initialCount = 48;

      await expectAvailableFieldCount(page, initialCount);

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await expectAvailableFieldCount(page, initialCount);
      await unifiedFieldList.searchField('i');
      await expectAvailableFieldCount(page, 28);

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await expectAvailableFieldCount(page, initialCount);
      await unifiedFieldList.searchField('e');
      await expectAvailableFieldCount(page, 42);
      await openSidebarFieldTypeFilter(page);
      await page.testSubj.locator('typeFilter-number').click();
      await closeSidebarFieldTypeFilter(page);
      await expectAvailableFieldCount(page, 4);

      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      await expectAvailableFieldCount(page, initialCount);

      await unifiedTabs.selectTab(1);
      await discover.waitUntilTabIsLoaded();
      await expectAvailableFieldCount(page, 28);

      await unifiedTabs.selectTab(2);
      await discover.waitUntilTabIsLoaded();
      await expectAvailableFieldCount(page, 4);

      await clearSidebarFieldSearch(page);
      await clearSidebarFieldTypeFilters(page);
      await expect(page.testSubj.locator('fieldListGroupedAvailableFields-count')).toHaveText(
        initialCount.toString()
      );
    });
  }
);
