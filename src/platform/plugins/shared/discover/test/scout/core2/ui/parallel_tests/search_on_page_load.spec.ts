/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutSpaceParallelFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { DATE_NESTED_KBN_ARCHIVE, SAVED_SEARCH_TITLE } from '../../../common/ui/fixtures/constants';
import { spaceTest, type DiscoverPageObjects } from '../fixtures';

spaceTest.describe(
  'Discover search on page load setting',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
      await discoverScoutSpace.savedObjects.load(DATE_NESTED_KBN_ARCHIVE);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.uiSettings.unset('discover:searchOnPageLoad');
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    const openDiscoverWithSearchOnPageLoad = async ({
      pageObjects,
      scoutSpace,
      searchOnPageLoad,
    }: {
      pageObjects: DiscoverPageObjects;
      scoutSpace: ScoutSpaceParallelFixture;
      searchOnPageLoad: boolean;
    }) => {
      await scoutSpace.uiSettings.set({
        'discover:searchOnPageLoad': searchOnPageLoad,
      });
      await pageObjects.discover.goto({ queryMode: 'classic' });
    };

    spaceTest(
      'does not fetch until the user requests data when disabled',
      async ({ scoutSpace, pageObjects, page }) => {
        const { discover } = pageObjects;
        const fieldList = page.testSubj.locator('fieldListGroupedFieldGroups');

        await openDiscoverWithSearchOnPageLoad({
          scoutSpace,
          pageObjects,
          searchOnPageLoad: false,
        });

        await expect(discover.getRefreshDataButton()).toBeVisible();
        expect(await discover.getSearchFetchCount()).toBe(0);
        await expect(fieldList).toBeHidden();

        await spaceTest.step('does not fetch on data view change', async () => {
          await discover.selectDataView('date-nested', { waitForFieldList: false });

          await expect(discover.getRefreshDataButton()).toBeVisible();
          expect(await discover.getSearchFetchCount()).toBe(0);
          await expect(fieldList).toBeHidden();
        });
      }
    );

    spaceTest(
      'loads fields after refresh button click when disabled',
      async ({ scoutSpace, pageObjects, page }) => {
        const { discover, unifiedFieldList } = pageObjects;
        const fieldList = page.testSubj.locator('fieldListGroupedFieldGroups');

        await openDiscoverWithSearchOnPageLoad({
          scoutSpace,
          pageObjects,
          searchOnPageLoad: false,
        });

        await expect(discover.getRefreshDataButton()).toBeVisible();
        expect(await discover.getSearchFetchCount()).toBe(0);
        await expect(fieldList).toBeHidden();

        await discover.getRefreshDataButton().click();

        await expect(discover.getRefreshDataButton()).toBeHidden();
        await unifiedFieldList.waitUntilSidebarHasLoaded();
        expect(await discover.getSearchFetchCount()).toBe(1);
        await expect(fieldList).toBeVisible();
      }
    );

    spaceTest(
      'loads fields after submit query when disabled',
      async ({ scoutSpace, pageObjects, page }) => {
        const { discover, unifiedFieldList } = pageObjects;
        const fieldList = page.testSubj.locator('fieldListGroupedFieldGroups');

        await openDiscoverWithSearchOnPageLoad({
          scoutSpace,
          pageObjects,
          searchOnPageLoad: false,
        });

        await expect(discover.getRefreshDataButton()).toBeVisible();
        expect(await discover.getSearchFetchCount()).toBe(0);
        await expect(fieldList).toBeHidden();

        await discover.submitQuery();

        await expect(discover.getRefreshDataButton()).toBeHidden();
        await unifiedFieldList.waitUntilSidebarHasLoaded();
        expect(await discover.getSearchFetchCount()).toBe(1);
        await expect(fieldList).toBeVisible();
      }
    );

    spaceTest(
      'loads fields after changing the time range when disabled',
      async ({ scoutSpace, pageObjects, page }) => {
        const { discover, unifiedFieldList } = pageObjects;
        const fieldList = page.testSubj.locator('fieldListGroupedFieldGroups');

        await openDiscoverWithSearchOnPageLoad({
          scoutSpace,
          pageObjects,
          searchOnPageLoad: false,
        });

        await expect(discover.getRefreshDataButton()).toBeVisible();
        expect(await discover.getSearchFetchCount()).toBe(0);
        await expect(fieldList).toBeHidden();

        await pageObjects.datePicker.setCommonlyUsedTime('This_week');

        await expect(discover.getRefreshDataButton()).toBeHidden();
        await unifiedFieldList.waitUntilSidebarHasLoaded();
        expect(await discover.getSearchFetchCount()).toBe(1);
        await expect(fieldList).toBeVisible();
      }
    );

    spaceTest(
      'does not fetch when saving a search while disabled',
      async ({ scoutSpace, pageObjects, page }) => {
        const { discover } = pageObjects;
        const fieldList = page.testSubj.locator('fieldListGroupedFieldGroups');

        await openDiscoverWithSearchOnPageLoad({
          scoutSpace,
          pageObjects,
          searchOnPageLoad: false,
        });

        await expect(discover.getRefreshDataButton()).toBeVisible();
        expect(await discover.getSearchFetchCount()).toBe(0);
        await expect(fieldList).toBeHidden();

        await discover.saveSearch(`saved-search-with-on-page-load-${Date.now()}`);

        await expect(discover.getRefreshDataButton()).toBeVisible();
        expect(await discover.getSearchFetchCount()).toBe(0);
        await expect(fieldList).toBeHidden();
      }
    );

    spaceTest(
      'resets to unfetched state after opening a saved search and pressing New',
      async ({ scoutSpace, pageObjects, page }) => {
        const { discover, unifiedFieldList } = pageObjects;
        const fieldList = page.testSubj.locator('fieldListGroupedFieldGroups');

        await openDiscoverWithSearchOnPageLoad({
          scoutSpace,
          pageObjects,
          searchOnPageLoad: false,
        });

        await discover.loadSavedSearch(SAVED_SEARCH_TITLE);
        await expect(discover.getRefreshDataButton()).toBeHidden();
        await unifiedFieldList.waitUntilSidebarHasLoaded();
        expect(await discover.getSearchFetchCount()).toBe(1);
        await expect(fieldList).toBeVisible();

        await discover.clickNewSearch();

        await expect(discover.getRefreshDataButton()).toBeVisible();
        expect(await discover.getSearchFetchCount()).toBe(0);
        await expect(fieldList).toBeHidden();
      }
    );

    spaceTest('fetches data initially when enabled', async ({ scoutSpace, pageObjects, page }) => {
      const { discover, unifiedFieldList } = pageObjects;
      const fieldList = page.testSubj.locator('fieldListGroupedFieldGroups');

      await openDiscoverWithSearchOnPageLoad({
        scoutSpace,
        pageObjects,
        searchOnPageLoad: true,
      });

      await expect(discover.getRefreshDataButton()).toBeHidden();
      await unifiedFieldList.waitUntilSidebarHasLoaded();
      expect(await discover.getSearchFetchCount()).toBe(1);
      await expect(fieldList).toBeVisible();
    });
  }
);
