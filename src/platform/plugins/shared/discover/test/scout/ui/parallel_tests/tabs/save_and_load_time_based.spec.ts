/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Time-based saved-search save/load flows.
 *
 * Validates that the "Store time with saved search" toggle appears or hides
 * in the save dialog depending on whether any tab uses a time-based source.
 */

import { spaceTest, type ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';
import {
  createDataViewFromSearchBar,
  openSaveDiscoverSessionModal,
} from '../../fixtures/tabs/helpers';

const AD_HOC_WITH_TIME_RANGE = 'log';
const AD_HOC_WITHOUT_TIME_RANGE = 'logs';
const PERSISTED_WITHOUT_TIME_RANGE = 'without-timefield';

spaceTest.describe('tabs - time based save behavior', { tag: '@local-stateful-classic' }, () => {
  spaceTest.setTimeout(180_000);

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.savedObjects.load(testData.INDEX_PATTERN_WITHOUT_TIMEFIELD_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.discover.setQueryMode('classic');
    await pageObjects.discover.goto();
    await pageObjects.discover.waitUntilSearchingHasFinished();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'should show time range switch when saving if any tab is time based',
    async ({ pageObjects, page }) => {
      const { discover } = pageObjects;

      const expectTimeSwitchVisible = async () => {
        await openSaveDiscoverSessionModal(page);
        await expect(page.testSubj.locator('storeTimeWithSearch')).toBeVisible();
        await closeSaveModal(page);
      };

      await spaceTest.step('case A: persisted DV is time-based, others are not', async () => {
        // Tab 2: ad hoc data view without time field
        await discover.createNewTab();
        await discover.waitUntilSearchingHasFinished();
        await createDataViewFromSearchBar(page, {
          name: AD_HOC_WITHOUT_TIME_RANGE,
          adHoc: true,
          hasTimeField: false,
        });
        await discover.waitUntilSearchingHasFinished();

        // Tab 3: ES|QL non-time-based
        await discover.createNewTab();
        await discover.waitUntilSearchingHasFinished();
        await discover.selectTextBaseLang();
        await discover.codeEditor.setCodeEditorValue('FROM without-timefield');
        await page.testSubj.click('querySubmitButton');
        await discover.waitUntilSearchingHasFinished();

        // Visit the time-based tab and check
        await discover.selectTabByIndex(0);
        await discover.waitUntilSearchingHasFinished();
        await expectTimeSwitchVisible();

        // Switch away, refresh so time-based tab is unvisited, then check
        await discover.selectTabByIndex(1);
        await page.reload();
        await discover.waitUntilSearchingHasFinished();
        await expectTimeSwitchVisible();
      });

      await spaceTest.step('case B: ad hoc DV is time-based, others are not', async () => {
        await discover.clickNewSearch();
        await discover.waitUntilSearchingHasFinished();
        await discover.selectDataView(PERSISTED_WITHOUT_TIME_RANGE);
        await discover.waitUntilSearchingHasFinished();

        // Tab 2: ad hoc data view with time field
        await discover.createNewTab();
        await discover.waitUntilSearchingHasFinished();
        await createDataViewFromSearchBar(page, {
          name: AD_HOC_WITH_TIME_RANGE,
          adHoc: true,
          hasTimeField: true,
        });
        await discover.waitUntilSearchingHasFinished();

        // Tab 3: ES|QL non-time-based
        await discover.createNewTab();
        await discover.waitUntilSearchingHasFinished();
        await discover.selectTextBaseLang();
        await discover.codeEditor.setCodeEditorValue('FROM without-timefield');
        await page.testSubj.click('querySubmitButton');
        await discover.waitUntilSearchingHasFinished();

        // Visit the time-based tab and check
        await discover.selectTabByIndex(1);
        await discover.waitUntilSearchingHasFinished();
        await expectTimeSwitchVisible();

        // Switch away, refresh, then check
        await discover.selectTabByIndex(0);
        await page.reload();
        await discover.waitUntilSearchingHasFinished();
        await expectTimeSwitchVisible();
      });

      await spaceTest.step('case C: ES|QL tab is time-based, DV tabs are not', async () => {
        await discover.clickNewSearch();
        await discover.waitUntilSearchingHasFinished();
        await discover.selectDataView(PERSISTED_WITHOUT_TIME_RANGE);
        await discover.waitUntilSearchingHasFinished();

        await discover.createNewTab();
        await discover.waitUntilSearchingHasFinished();
        await createDataViewFromSearchBar(page, {
          name: AD_HOC_WITHOUT_TIME_RANGE,
          adHoc: true,
          hasTimeField: false,
        });
        await discover.waitUntilSearchingHasFinished();

        // Tab 3: ES|QL time-based
        await discover.createNewTab();
        await discover.waitUntilSearchingHasFinished();
        await discover.selectTextBaseLang();
        await discover.codeEditor.setCodeEditorValue(
          'FROM logstash-* | SORT @timestamp DESC | LIMIT 10'
        );
        await page.testSubj.click('querySubmitButton');
        await discover.waitUntilSearchingHasFinished();

        // Visit ES|QL time-based tab and check
        await discover.selectTabByIndex(2);
        await discover.waitUntilSearchingHasFinished();
        await expectTimeSwitchVisible();

        // Switch away, refresh, then check
        await discover.selectTabByIndex(1);
        await page.reload();
        await discover.waitUntilSearchingHasFinished();
        await expectTimeSwitchVisible();
      });
    }
  );

  spaceTest(
    'should not show time range switch when no tab is time based',
    async ({ pageObjects, page }) => {
      const { discover } = pageObjects;

      const expectTimeSwitchMissing = async () => {
        await openSaveDiscoverSessionModal(page);
        await expect(page.testSubj.locator('storeTimeWithSearch')).toBeHidden();
        await closeSaveModal(page);
      };

      // Tab 1: persisted data view without time field
      await discover.selectDataView(PERSISTED_WITHOUT_TIME_RANGE);
      await discover.waitUntilSearchingHasFinished();

      // Tab 2: ad hoc data view without time field
      await discover.createNewTab();
      await discover.waitUntilSearchingHasFinished();
      await createDataViewFromSearchBar(page, {
        name: AD_HOC_WITHOUT_TIME_RANGE,
        adHoc: true,
        hasTimeField: false,
      });
      await discover.waitUntilSearchingHasFinished();

      // Tab 3: ES|QL non-time-based
      await discover.createNewTab();
      await discover.waitUntilSearchingHasFinished();
      await discover.selectTextBaseLang();
      await discover.codeEditor.setCodeEditorValue('FROM without-timefield');
      await page.testSubj.click('querySubmitButton');
      await discover.waitUntilSearchingHasFinished();

      await expectTimeSwitchMissing();

      // Refresh, then check again
      await page.reload();
      await discover.waitUntilSearchingHasFinished();
      await expectTimeSwitchMissing();
    }
  );
});

const closeSaveModal = async (page: ScoutPage) => {
  await page.testSubj.click('saveCancelButton');
  await expect(page.testSubj.locator('savedObjectSaveModal')).toBeHidden();
};
