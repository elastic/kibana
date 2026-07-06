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

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../../../fixtures/common';

const AD_HOC_WITH_TIME_RANGE = 'log';
const AD_HOC_WITHOUT_TIME_RANGE = 'logs';
const PERSISTED_WITHOUT_TIME_RANGE = 'without-timefield';

spaceTest.describe('tabs - time based save behavior', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
    await discoverScoutSpace.savedObjects.load(testData.INDEX_PATTERN_WITHOUT_TIMEFIELD_ARCHIVE);
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
    'shows the store-time switch when the persisted data view tab is time based',
    async ({ pageObjects, page }) => {
      const { discover, unifiedTabs } = pageObjects;

      // Tab 0 keeps the default time-based `logstash-*` data view.
      await addNonTimeBasedAdHocTab(pageObjects);
      await addNonTimeBasedEsqlTab(pageObjects);

      await spaceTest.step('switch is shown while the time-based tab is active', async () => {
        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await (await openSaveModalTimeSwitch(pageObjects, page)).waitFor({ state: 'visible' });
        await closeSaveModal(page);
      });

      await spaceTest.step('switch is shown when the time-based tab is unvisited', async () => {
        await unifiedTabs.selectTab(1);
        await discover.waitForTabStateToPersist();
        await page.reload();
        await discover.waitUntilTabIsLoaded();
        await expect(await openSaveModalTimeSwitch(pageObjects, page)).toBeVisible();
        await closeSaveModal(page);
      });
    }
  );

  spaceTest(
    'shows the store-time switch when an ad hoc data view tab is time based',
    async ({ pageObjects, page }) => {
      const { discover, unifiedTabs } = pageObjects;

      // Tab 0: persisted data view without a time field.
      await discover.selectDataView(PERSISTED_WITHOUT_TIME_RANGE);
      await discover.waitUntilTabIsLoaded();

      // Tab 1: ad hoc data view with a time field (the only time-based tab).
      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await discover.createDataViewFromSearchBar({ name: AD_HOC_WITH_TIME_RANGE, adHoc: true });
      await discover.waitUntilTabIsLoaded();

      await addNonTimeBasedEsqlTab(pageObjects);

      await spaceTest.step('switch is shown while the time-based tab is active', async () => {
        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        await (await openSaveModalTimeSwitch(pageObjects, page)).waitFor({ state: 'visible' });
        await closeSaveModal(page);
      });

      await spaceTest.step('switch is shown when the time-based tab is unvisited', async () => {
        await unifiedTabs.selectTab(0);
        await discover.waitForTabStateToPersist();
        await page.reload();
        await discover.waitUntilTabIsLoaded();
        await expect(await openSaveModalTimeSwitch(pageObjects, page)).toBeVisible();
        await closeSaveModal(page);
      });
    }
  );

  spaceTest(
    'shows the store-time switch when the ES|QL tab is time based',
    async ({ pageObjects, page }) => {
      const { discover, unifiedTabs } = pageObjects;

      // Tab 0: persisted data view without a time field.
      await discover.selectDataView(PERSISTED_WITHOUT_TIME_RANGE);
      await discover.waitUntilTabIsLoaded();

      await addNonTimeBasedAdHocTab(pageObjects);

      // Tab 2: time-based ES|QL query (the only time-based tab).
      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await discover.selectTextBaseLang();
      await discover.codeEditor.setCodeEditorValue(
        'FROM logstash-* | SORT @timestamp DESC | LIMIT 10'
      );
      await page.testSubj.click('querySubmitButton');
      await discover.waitUntilTabIsLoaded();

      await spaceTest.step('switch is shown while the time-based tab is active', async () => {
        await unifiedTabs.selectTab(2);
        await discover.waitUntilTabIsLoaded();
        await (await openSaveModalTimeSwitch(pageObjects, page)).waitFor({ state: 'visible' });
        await closeSaveModal(page);
      });

      await spaceTest.step('switch is shown when the time-based tab is unvisited', async () => {
        await unifiedTabs.selectTab(1);
        await discover.waitForTabStateToPersist();
        await page.reload();
        await discover.waitUntilTabIsLoaded();
        await expect(await openSaveModalTimeSwitch(pageObjects, page)).toBeVisible();
        await closeSaveModal(page);
      });
    }
  );

  spaceTest(
    'hides the store-time switch when no tab is time based',
    async ({ pageObjects, page }) => {
      const { discover } = pageObjects;

      // Tab 0: persisted data view without a time field.
      await discover.selectDataView(PERSISTED_WITHOUT_TIME_RANGE);
      await discover.waitUntilTabIsLoaded();

      await addNonTimeBasedAdHocTab(pageObjects);
      await addNonTimeBasedEsqlTab(pageObjects);

      await (await openSaveModalTimeSwitch(pageObjects, page)).waitFor({ state: 'hidden' });
      await closeSaveModal(page);

      await spaceTest.step('switch stays hidden after a reload', async () => {
        await discover.waitForTabStateToPersist();
        await page.reload();
        await discover.waitUntilTabIsLoaded();
        await expect(await openSaveModalTimeSwitch(pageObjects, page)).toBeHidden();
        await closeSaveModal(page);
      });
    }
  );
});

/**
 * Opens the Save modal and returns the "Store time with saved search" switch
 * locator so the test can assert its visibility. Assertions stay in the test
 * body (per Scout best practices and the `playwright/expect-expect` rule).
 */
const openSaveModalTimeSwitch = async (pageObjects: PageObjects, page: ScoutPage) => {
  await pageObjects.discover.openSaveSearchModal();
  return page.testSubj.locator('storeTimeWithSearch');
};

const closeSaveModal = async (page: ScoutPage) => {
  await page.testSubj.click('saveCancelButton');
  await page.testSubj.locator('savedObjectSaveModal').waitFor({ state: 'hidden' });
};

/** Adds a new tab backed by an ad hoc data view without a time field. */
const addNonTimeBasedAdHocTab = async (pageObjects: PageObjects) => {
  const { discover, unifiedTabs } = pageObjects;
  await unifiedTabs.createNewTab();
  await discover.waitUntilTabIsLoaded();
  await discover.createDataViewFromSearchBar({
    name: AD_HOC_WITHOUT_TIME_RANGE,
    adHoc: true,
    hasTimeField: false,
  });
  await discover.waitUntilTabIsLoaded();
};

/** Adds a new tab running a non-time-based ES|QL query. */
const addNonTimeBasedEsqlTab = async (pageObjects: PageObjects) => {
  const { discover, unifiedTabs } = pageObjects;
  await unifiedTabs.createNewTab();
  await discover.waitUntilTabIsLoaded();
  await discover.selectTextBaseLang();
  await discover.codeEditor.setCodeEditorValue('FROM without-timefield');
  await discover.submitQuery();
  await discover.waitUntilTabIsLoaded();
};
