/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../../fixtures/common';

const UPDATED_TIME_RANGE = {
  from: 'Sep 19, 2015 @ 06:31:44.000',
  to: 'Sep 20, 2015 @ 18:31:44.000',
};

const INITIAL_TIME_CONFIGURATION = {
  time: {
    start: testData.DEFAULT_TIME_RANGE.from,
    end: testData.DEFAULT_TIME_RANGE.to,
  },
  refresh: { interval: '60', units: 'Seconds', isPaused: true },
  hitCount: 14_004,
} as const;

const UPDATED_TIME_CONFIGURATION = {
  time: {
    start: '2015-09-19T06:31:44.000Z',
    end: '2015-09-20T18:31:44.000Z',
  },
  refresh: { interval: '30', units: 'Seconds', isPaused: false },
  hitCount: 4_589,
} as const;

const waitForTimePicker = async ({ datePicker }: PageObjects) => {
  await expect(async () => {
    expect(await datePicker.timePickerExists()).toBe(true);
  }).toPass();
};

const getCurrentTimeConfiguration = async (page: ScoutPage, pageObjects: PageObjects) => {
  const { datePicker, discover } = pageObjects;
  await waitForTimePicker(pageObjects);

  const time = await datePicker.getTimeConfig();
  await page.keyboard.press('Escape');
  await waitForTimePicker(pageObjects);

  return {
    time,
    refresh: await datePicker.getRefreshConfig(),
    hitCount: await discover.getHitCountInt(),
  };
};

const configureUpdatedTime = async (pageObjects: PageObjects) => {
  const { datePicker, discover } = pageObjects;

  await datePicker.setAbsoluteRange({ from: UPDATED_TIME_RANGE.from, to: UPDATED_TIME_RANGE.to });
  await discover.waitUntilTabIsLoaded();
  await datePicker.startAutoRefresh(30);
  await discover.waitUntilTabIsLoaded();
};

const createTabsWithStoredTimeDifference = async (pageObjects: PageObjects) => {
  const { discover, unifiedTabs } = pageObjects;

  await unifiedTabs.createNewTab();
  await discover.waitUntilTabIsLoaded();
  await unifiedTabs.createNewTab();
  await discover.waitUntilTabIsLoaded();
  await configureUpdatedTime(pageObjects);
  await unifiedTabs.selectTab(0);
  await discover.waitUntilTabIsLoaded();
};

spaceTest.describe('Discover tabs - time range', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.selectDataView(testData.DEFAULT_DATA_VIEW);
    await pageObjects.discover.waitUntilTabIsLoaded();
    await expect(async () => {
      expect(await pageObjects.datePicker.timePickerExists()).toBe(true);
    }).toPass();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'should not save different time ranges when the switch is off',
    async ({ page, pageObjects }) => {
      const { discover, unifiedTabs } = pageObjects;
      const sessionName = 'tabs time range without stored time';

      await createTabsWithStoredTimeDifference(pageObjects);
      await discover.saveSearch(sessionName, { storeTimeRange: false });
      await discover.waitUntilTabIsLoaded();
      expect(await discover.hasUnsavedChangesIndicator()).toBe(false);

      await discover.clickNewSearch();
      await discover.loadSavedSearch(sessionName);

      await expect(async () => {
        expect(await getCurrentTimeConfiguration(page, pageObjects)).toStrictEqual(
          INITIAL_TIME_CONFIGURATION
        );
      }).toPass();

      await unifiedTabs.selectTab(1);
      await discover.waitUntilTabIsLoaded();
      await expect(async () => {
        expect(await getCurrentTimeConfiguration(page, pageObjects)).toStrictEqual(
          INITIAL_TIME_CONFIGURATION
        );
      }).toPass();

      await unifiedTabs.selectTab(2);
      await discover.waitUntilTabIsLoaded();
      await expect(async () => {
        expect(await getCurrentTimeConfiguration(page, pageObjects)).toStrictEqual(
          INITIAL_TIME_CONFIGURATION
        );
      }).toPass();
      expect(await discover.hasUnsavedChangesIndicator()).toBe(false);
    }
  );

  spaceTest(
    'should save different time ranges when the switch is on',
    async ({ page, pageObjects }) => {
      const { discover, unifiedTabs } = pageObjects;
      const sessionName = 'tabs time range with stored time';

      await createTabsWithStoredTimeDifference(pageObjects);
      await discover.saveSearch(sessionName, { storeTimeRange: true });
      await discover.waitUntilTabIsLoaded();
      expect(await discover.hasUnsavedChangesIndicator()).toBe(false);

      await discover.clickNewSearch();
      await discover.loadSavedSearch(sessionName);

      await expect(async () => {
        expect(await getCurrentTimeConfiguration(page, pageObjects)).toStrictEqual(
          INITIAL_TIME_CONFIGURATION
        );
      }).toPass();

      await unifiedTabs.selectTab(2);
      await discover.waitUntilTabIsLoaded();
      await expect(async () => {
        expect(await getCurrentTimeConfiguration(page, pageObjects)).toStrictEqual(
          UPDATED_TIME_CONFIGURATION
        );
      }).toPass();
      expect(await discover.hasUnsavedChangesIndicator()).toBe(false);

      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      await configureUpdatedTime(pageObjects);
      expect(await discover.hasUnsavedChangesIndicator()).toBe(true);
    }
  );
});
