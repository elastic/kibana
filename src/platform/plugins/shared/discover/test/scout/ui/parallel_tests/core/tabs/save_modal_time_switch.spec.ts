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

const WITHOUT_TIMEFIELD_DATA_VIEW = 'without-timefield';

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
      'shows the switch when an unvisited persisted tab is time-based',
      async ({ page, pageObjects }) => {
        const { discover, unifiedTabs } = pageObjects;

        await spaceTest.step(
          'create a time-based persisted tab after a non-time-based tab',
          async () => {
            await discover.selectDataView(WITHOUT_TIMEFIELD_DATA_VIEW);
            await discover.waitUntilTabIsLoaded();

            await unifiedTabs.createNewTab();
            await discover.waitUntilTabIsLoaded();
            await discover.selectDataView(testData.DEFAULT_DATA_VIEW);
            await discover.waitUntilTabIsLoaded();
          }
        );

        await spaceTest.step('refresh before visiting the time-based tab again', async () => {
          await unifiedTabs.selectTab(0);
          await discover.waitUntilTabIsLoaded();
          await page.reload();
          await discover.waitUntilTabIsLoaded();
        });

        await spaceTest.step('show the store time switch', async () => {
          await discover.openSaveSearchModal();
          await expect(discover.getStoreTimeWithSearchSwitch()).toBeVisible();
          await discover.closeSaveSearchModal();
        });
      }
    );

    spaceTest(
      'shows the switch when only an ad hoc tab is time-based',
      async ({ page, pageObjects }) => {
        const { discover, unifiedTabs } = pageObjects;

        await spaceTest.step(
          'create a time-based ad hoc tab after a non-time-based tab',
          async () => {
            await discover.selectDataView(WITHOUT_TIMEFIELD_DATA_VIEW);
            await discover.waitUntilTabIsLoaded();

            await unifiedTabs.createNewTab();
            await discover.waitUntilTabIsLoaded();
            await discover.createDataViewFromSearchBar({ name: 'logs', adHoc: true });
            await discover.waitUntilTabIsLoaded();
          }
        );

        await spaceTest.step('refresh before visiting the time-based tab again', async () => {
          await unifiedTabs.selectTab(0);
          await discover.waitUntilTabIsLoaded();
          await page.reload();
          await discover.waitUntilTabIsLoaded();
        });

        await spaceTest.step('show the store time switch', async () => {
          await discover.openSaveSearchModal();
          await expect(discover.getStoreTimeWithSearchSwitch()).toBeVisible();
          await discover.closeSaveSearchModal();
        });
      }
    );

    spaceTest(
      'shows the switch when only an ESQL tab is time-based',
      async ({ page, pageObjects }) => {
        const { discover, unifiedTabs } = pageObjects;

        await spaceTest.step(
          'create a time-based ESQL tab after a non-time-based tab',
          async () => {
            await discover.selectDataView(WITHOUT_TIMEFIELD_DATA_VIEW);
            await discover.waitUntilTabIsLoaded();

            await unifiedTabs.createNewTab();
            await discover.waitUntilTabIsLoaded();
            await discover.writeAndSubmitEsqlQuery('FROM logstash-* | LIMIT 10');
          }
        );

        await spaceTest.step('refresh before visiting the time-based tab again', async () => {
          await unifiedTabs.selectTab(0);
          await discover.waitUntilTabIsLoaded();
          await page.reload();
          await discover.waitUntilTabIsLoaded();
        });

        await spaceTest.step('show the store time switch', async () => {
          await discover.openSaveSearchModal();
          await expect(discover.getStoreTimeWithSearchSwitch()).toBeVisible();
          await discover.closeSaveSearchModal();
        });
      }
    );

    spaceTest('hides the switch when no tabs are time-based', async ({ page, pageObjects }) => {
      const { discover, unifiedTabs } = pageObjects;

      await spaceTest.step('create only non-time-based tabs', async () => {
        await discover.selectDataView(WITHOUT_TIMEFIELD_DATA_VIEW);
        await discover.waitUntilTabIsLoaded();

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await discover.selectDataView(WITHOUT_TIMEFIELD_DATA_VIEW);
        await discover.waitUntilTabIsLoaded();
      });

      await spaceTest.step('refresh before visiting all tabs again', async () => {
        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await page.reload();
        await discover.waitUntilTabIsLoaded();
      });

      await spaceTest.step('hide the store time switch', async () => {
        await discover.openSaveSearchModal();
        await expect(discover.getStoreTimeWithSearchSwitch()).toBeHidden();
        await discover.closeSaveSearchModal();
      });
    });
  }
);
