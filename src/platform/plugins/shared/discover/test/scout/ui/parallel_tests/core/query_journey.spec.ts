/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover query journey: a single end-to-end run through saving / loading /
 * renaming a saved search, asserting hit counts, chart metadata, histogram
 * drill-down, and persisted-query revert. Migrated from the "query" describe
 * in `src/platform/test/functional/apps/discover/group1/_discover.ts`.
 *
 * The original FTR file is a long sequential journey where each `it` builds
 * on the last. Per the migration plan, we preserve that journey as one
 * Playwright test with named `spaceTest.step` blocks rather than splitting
 * into independent specs that would have to recreate state.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

const { DEFAULT_TIME_RANGE_DISPLAY } = testData;

const QUERY_NAME = 'Query # 1';
const QUERY_NAME_RENAMED = 'Modified Query # 1';
const EXPECTED_HIT_COUNT = '14,004';
const EXPECTED_FIRST_ROW_TIMESTAMP = 'Sep 22, 2015 @ 23:50:13.253';

spaceTest.describe('Discover - query journey', { tag: tags.stateful.all }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    // Privileged user is needed because the journey saves a search.
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.setQueryMode('classic');
    await pageObjects.discover.goto();
    await pageObjects.discover.waitUntilSearchingHasFinished();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('save / load / rename / drill-down / revert', async ({ pageObjects }) => {
    await spaceTest.step('time picker shows the configured default range', async () => {
      const time = await pageObjects.datePicker.getTimeConfig();
      expect(time.start).toBe(DEFAULT_TIME_RANGE_DISPLAY.start);
      expect(time.end).toBe(DEFAULT_TIME_RANGE_DISPLAY.end);
      // FTR also asserts on the newest doc timestamp here, as a UTC sanity
      // check (the time-zone-switch sequential spec proves the symmetric case).
      const rowData = await pageObjects.discover.getDocTableIndex(1);
      expect(rowData).toContain(EXPECTED_FIRST_ROW_TIMESTAMP);
    });

    await spaceTest.step('saving the search updates the displayed query name', async () => {
      await pageObjects.discover.saveSearch(QUERY_NAME);
      await pageObjects.discover.waitUntilSearchingHasFinished();
      expect(await pageObjects.discover.getCurrentQueryName()).toBe(QUERY_NAME);
    });

    await spaceTest.step('loading the saved search restores the query name', async () => {
      await pageObjects.discover.loadSavedSearch(QUERY_NAME);
      await pageObjects.discover.waitUntilSearchingHasFinished();
      expect(await pageObjects.discover.getCurrentQueryName()).toBe(QUERY_NAME);
    });

    await spaceTest.step('saving over the loaded search renames it in the breadcrumb', async () => {
      await pageObjects.discover.loadSavedSearch(QUERY_NAME);
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.saveSearch(QUERY_NAME_RENAMED);
      await pageObjects.discover.waitUntilSearchingHasFinished();
      expect(await pageObjects.discover.getCurrentQueryName()).toBe(QUERY_NAME_RENAMED);
    });

    await spaceTest.step('hit count reflects the unfiltered logstash dataset', async () => {
      // Anchor on the locator (per addendum: hit count can lag by >5s after a
      // query swap; `waitUntilSearchingHasFinished` doesn't sync the count).
      await expect(pageObjects.discover.hitCountLocator()).toHaveText(EXPECTED_HIT_COUNT, {
        timeout: 30_000,
      });
    });

    await spaceTest.step('chart timespan shows the default 4-day range', async () => {
      const timespan = await pageObjects.discover.getChartTimespan();
      expect(timespan).toBe(
        `${DEFAULT_TIME_RANGE_DISPLAY.start} - ${DEFAULT_TIME_RANGE_DISPLAY.end} (interval: Auto - 3 hours)`
      );
    });

    await spaceTest.step('clicking a histogram bar drills down to that bar window', async () => {
      // Reset to the default range first so the histogram has predictable
      // bars (the previous step left the chart at the same range).
      await pageObjects.datePicker.setAbsoluteRange({
        from: DEFAULT_TIME_RANGE_DISPLAY.start,
        to: DEFAULT_TIME_RANGE_DISPLAY.end,
      });
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.clickHistogramBar();
      await pageObjects.discover.waitUntilSearchingHasFinished();

      const time = await pageObjects.datePicker.getTimeConfig();
      expect(time.start).toBe('Sep 21, 2015 @ 09:00:00.000');
      expect(time.end).toBe('Sep 21, 2015 @ 12:00:00.000');

      // First doc in the drill-down window has a known timestamp.
      await expect
        .poll(() => pageObjects.discover.getDocTableField(1), { timeout: 10_000 })
        .toContain('Sep 21, 2015 @ 11:59:22.316');
    });

    await spaceTest.step('chart interval defaults to "auto"', async () => {
      await pageObjects.datePicker.setAbsoluteRange({
        from: DEFAULT_TIME_RANGE_DISPLAY.start,
        to: DEFAULT_TIME_RANGE_DISPLAY.end,
      });
      await pageObjects.discover.waitUntilSearchingHasFinished();
      // Click the hit count to dismiss any chart tooltip the previous step
      // may have left hanging (FTR did the same).
      await pageObjects.discover.hitCountLocator().click();
      expect(await pageObjects.discover.getChartInterval()).toBe('auto');
    });

    await spaceTest.step('the no-results panel is not shown for the default range', async () => {
      expect(await pageObjects.discover.hasNoResults()).toBe(false);
    });

    await spaceTest.step(
      'reverting an unsaved query change restores the persisted hit count',
      async () => {
        await pageObjects.datePicker.setAbsoluteRange({
          from: DEFAULT_TIME_RANGE_DISPLAY.start,
          to: DEFAULT_TIME_RANGE_DISPLAY.end,
        });
        await pageObjects.discover.waitUntilSearchingHasFinished();

        await pageObjects.queryBar.setQuery('test');
        await pageObjects.queryBar.submitQuery();
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await expect(pageObjects.discover.hitCountLocator()).toHaveText('22', {
          timeout: 30_000,
        });

        await pageObjects.queryBar.clearQuery();
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.discover.revertUnsavedChanges();
        await pageObjects.discover.waitUntilSearchingHasFinished();

        expect(await pageObjects.queryBar.getQueryString()).toBe('');
        await expect(pageObjects.discover.hitCountLocator()).toHaveText(EXPECTED_HIT_COUNT, {
          timeout: 30_000,
        });
      }
    );
  });
});
