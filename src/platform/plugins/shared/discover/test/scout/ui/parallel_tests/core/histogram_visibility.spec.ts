/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover histogram hide/show persistence: the chart-visibility toggle is
 * persisted across page reloads, across navigations, and inside saved
 * searches. Migrated from three `it`s of `_discover_histogram.ts` collapsed
 * into one journey (they share the same setup and otherwise duplicate it
 * three times in FTR).
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

const { LONG_WINDOW_LOGSTASH_KBN_ARCHIVE, LONG_WINDOW_LOGSTASH_DATA_VIEW } = testData;
const SAVED_SEARCH = 'persisted hidden histogram';
const WIDE_RANGE = {
  from: '2010-01-01T00:00:00.000Z',
  to: '2019-03-21T00:00:00.000Z',
};

spaceTest.describe('Discover - histogram visibility', { tag: tags.stateful.all }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.savedObjects.load(LONG_WINDOW_LOGSTASH_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(LONG_WINDOW_LOGSTASH_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(WIDE_RANGE);
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
    'persists chart hide/show in URL, across navigations, and in saved searches',
    async ({ page, pageObjects }) => {
      expect(await pageObjects.discover.chartCanvasExists()).toBe(true);

      await spaceTest.step('hidden state persists across reload', async () => {
        await pageObjects.discover.toggleChartVisibility();
        expect(await pageObjects.discover.chartCanvasExists()).toBe(false);
        await page.reload();
        await pageObjects.discover.waitUntilSearchingHasFinished();
        expect(await pageObjects.discover.chartCanvasExists()).toBe(false);
        await pageObjects.discover.toggleChartVisibility();
        await expect.poll(() => pageObjects.discover.chartCanvasExists()).toBe(true);
      });

      await spaceTest.step('hidden state persists across navigation', async () => {
        await pageObjects.discover.toggleChartVisibility();
        expect(await pageObjects.discover.chartCanvasExists()).toBe(false);
        await pageObjects.dashboard.goto();
        await pageObjects.discover.goto();
        await pageObjects.discover.waitUntilSearchingHasFinished();
        expect(await pageObjects.discover.chartCanvasExists()).toBe(false);
        await pageObjects.discover.toggleChartVisibility();
        await expect.poll(() => pageObjects.discover.chartCanvasExists()).toBe(true);
      });

      await spaceTest.step(
        'hidden state is persisted into a saved search and round-trips',
        async () => {
          await pageObjects.discover.toggleChartVisibility();
          expect(await pageObjects.discover.chartCanvasExists()).toBe(false);

          await pageObjects.discover.saveSearch(SAVED_SEARCH);
          await pageObjects.discover.waitUntilSearchingHasFinished();

          await pageObjects.discover.clickNewSearchButton();
          await pageObjects.discover.loadSavedSearch(SAVED_SEARCH);
          await pageObjects.discover.waitUntilSearchingHasFinished();
          expect(await pageObjects.discover.chartCanvasExists()).toBe(false);

          // Re-show, re-save, re-load: should come back visible.
          await pageObjects.discover.toggleChartVisibility();
          await expect.poll(() => pageObjects.discover.chartCanvasExists()).toBe(true);
          await pageObjects.discover.saveSearch(SAVED_SEARCH);
          await pageObjects.discover.waitUntilSearchingHasFinished();
          await pageObjects.discover.clickNewSearchButton();
          await pageObjects.discover.loadSavedSearch(SAVED_SEARCH);
          await pageObjects.discover.waitUntilSearchingHasFinished();
          expect(await pageObjects.discover.chartCanvasExists()).toBe(true);
        }
      );
    }
  );
});
