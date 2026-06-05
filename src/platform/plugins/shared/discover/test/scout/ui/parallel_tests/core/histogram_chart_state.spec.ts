/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover histogram state persistence: chart interval is round-tripped
 * through a saved search, reverting drops unsaved breakdown/interval, and
 * clearing the chart interval restores `auto`. Migrated from three `it`s of
 * `_discover_histogram.ts`.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

const { LONG_WINDOW_LOGSTASH_KBN_ARCHIVE, LONG_WINDOW_LOGSTASH_DATA_VIEW } = testData;

const readHistogramRequestData = async (page: import('@kbn/scout').ScoutPage) => {
  const attr = await page.testSubj
    .locator('unifiedHistogramChart')
    .getAttribute('data-request-data');
  return JSON.parse(attr ?? '{}');
};

spaceTest.describe('Discover - histogram chart state', { tag: tags.stateful.all }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.savedObjects.load(LONG_WINDOW_LOGSTASH_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(LONG_WINDOW_LOGSTASH_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
    await scoutSpace.uiSettings.set({ 'dateFormat:tz': 'Europe/Berlin' });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.setQueryMode('classic');
    await pageObjects.discover.goto();
    await pageObjects.discover.waitUntilSearchingHasFinished();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults', 'dateFormat:tz');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'recovers from a broken KQL query when the query bar is cleared',
    async ({ pageObjects }) => {
      await pageObjects.queryBar.setQuery('this is > not valid');
      await pageObjects.queryBar.submitQuery();
      await pageObjects.discover.showsErrorCallout();

      await pageObjects.queryBar.clearQuery();
      await pageObjects.queryBar.submitQuery();
      await pageObjects.discover.waitUntilSearchingHasFinished();
      expect(await pageObjects.discover.isChartVisible()).toBe(true);
    }
  );

  spaceTest(
    'reverting a saved search clears breakdown and chart interval',
    async ({ page, pageObjects }) => {
      const savedSearch = 'histogram state';
      await pageObjects.discover.saveSearch(savedSearch);
      await pageObjects.discover.waitUntilSearchingHasFinished();

      await pageObjects.discover.chooseBreakdownField('extension.keyword');
      await pageObjects.discover.setChartInterval('Second');

      await expect
        .poll(() => readHistogramRequestData(page))
        .toMatchObject({
          dataViewId: LONG_WINDOW_LOGSTASH_DATA_VIEW,
          timeField: '@timestamp',
          timeInterval: 's',
          breakdownField: 'extension.keyword',
        });

      await pageObjects.discover.toggleChartVisibility();
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.revertUnsavedChanges();
      await pageObjects.discover.waitUntilSearchingHasFinished();

      await expect
        .poll(() => readHistogramRequestData(page))
        .toMatchObject({
          dataViewId: LONG_WINDOW_LOGSTASH_DATA_VIEW,
          timeField: '@timestamp',
          timeInterval: 'auto',
        });
    }
  );

  spaceTest(
    'chart interval is persisted and cleared via saved search round-trips',
    async ({ pageObjects }) => {
      const withInterval = 'with chart interval';
      await pageObjects.discover.setChartInterval('Second');
      await pageObjects.discover.saveSearch(withInterval);
      await pageObjects.discover.waitUntilSearchingHasFinished();

      await pageObjects.discover.clickNewSearchButton();
      expect(await pageObjects.discover.getChartInterval()).toBe('auto');

      await pageObjects.discover.loadSavedSearch(withInterval);
      await pageObjects.discover.waitUntilSearchingHasFinished();
      expect(await pageObjects.discover.getChartInterval()).toBe('s');

      // Now save with `Auto` and confirm clearing.
      const clearedAgain = 'with chart interval then cleared';
      await pageObjects.discover.setChartInterval('Minute');
      await pageObjects.discover.saveSearch(clearedAgain);
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.setChartInterval('Auto');
      await pageObjects.discover.saveSearch(clearedAgain);
      await pageObjects.discover.waitUntilSearchingHasFinished();

      await pageObjects.discover.clickNewSearchButton();
      await pageObjects.discover.loadSavedSearch(clearedAgain);
      await pageObjects.discover.waitUntilSearchingHasFinished();
      expect(await pageObjects.discover.getChartInterval()).toBe('auto');
    }
  );
});
