/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../../../fixtures/common';

spaceTest.describe(
  'Discover tabs - save modal time switch',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
      await discoverScoutSpace.savedObjects.load(
        'src/platform/test/functional/fixtures/kbn_archiver/index_pattern_without_timefield'
      );
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
      'shows the store time switch only when at least one tab is time-based after refresh',
      async ({ page, pageObjects }) => {
        const { discover, unifiedTabs } = pageObjects;
        const storeTimeWithSearchSwitch = discover.getStoreTimeWithSearchSwitch();

        await spaceTest.step('show the switch when an unvisited tab is time-based', async () => {
          await discover.selectDataView('without-timefield');
          await discover.waitUntilTabIsLoaded();

          await unifiedTabs.createNewTab();
          await discover.waitUntilTabIsLoaded();
          await discover.selectDataView(testData.DEFAULT_DATA_VIEW);
          await discover.waitUntilTabIsLoaded();

          await unifiedTabs.selectTab(0);
          await discover.waitUntilTabIsLoaded();
          await page.reload();
          await discover.waitUntilTabIsLoaded();

          await discover.openSaveSearchModal();
          await expect(storeTimeWithSearchSwitch).toBeVisible();
          await discover.closeSaveSearchModal();
        });

        await spaceTest.step('hide the switch when no tabs are time-based', async () => {
          await discover.clickNewSearch();
          await discover.selectDataView('without-timefield');
          await discover.waitUntilTabIsLoaded();

          await unifiedTabs.createNewTab();
          await discover.waitUntilTabIsLoaded();
          await discover.selectDataView('without-timefield');
          await discover.waitUntilTabIsLoaded();

          await unifiedTabs.selectTab(0);
          await discover.waitUntilTabIsLoaded();
          await page.reload();
          await discover.waitUntilTabIsLoaded();

          await discover.openSaveSearchModal();
          await expect(storeTimeWithSearchSwitch).toBeHidden();
          await discover.closeSaveSearchModal();
        });
      }
    );
  }
);
