/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect, test } from '@kbn/scout';
import { uiSettingsFixture } from '@kbn/scout/src/playwright/fixtures/scope/worker';

const defaultSettings = {
  defaultIndex: 'logstash-*',
  'dateFormat:tz': 'UTC',
};

test.describe('discover test', { tag: ['@ess'] }, () => {
  test.beforeAll(async ({ kbnClient, esArchiver }) => {
    await kbnClient.importExport.load(
      'src/platform/test/functional/fixtures/kbn_archiver/discover'
    );
    await esArchiver.loadIfNeeded(
      'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
    );
    await kbnClient.uiSettings.update(defaultSettings);
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.discover.goto();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.clean({ types: ['search', 'index-pattern'] });
  });

  test.describe('timepicker queries', () => {
    const queryName1 = 'Query # 1';
    const queryName2 = 'Query # 2';

    test('should show correct time range string by timepicker', async ({ pageObjects }) => {
      await pageObjects.timePicker.setDefaultAbsoluteRange();
      const time = await pageObjects.timePicker.getTimeConfig();
      expect(time.start).toBe(pageObjects.timePicker.defaultStartTime);
      expect(time.end).toBe(pageObjects.timePicker.defaultEndTime);

      const rowData = await pageObjects.discover.getDocTableIndex(1);
      expect(rowData).toContain('Sep 22, 2015 @ 23:50:13.253');
    });

    test('save query should show toast message and display query name', async ({
      pageObjects,
      uiSettings,
    }) => {
      await uiSettings.setDefaultTime({
        from: pageObjects.timePicker.defaultStartTime,
        to: pageObjects.timePicker.defaultEndTime,
      });
      await pageObjects.discover.saveSearch(queryName1);
      const actualQueryNameString = await pageObjects.discover.getCurrentQueryName();
      expect(actualQueryNameString).toBe(queryName1);
    });

    test('should refetch when autofresh is enabled', async ({ pageObjects, uiSettings }) => {
      const interval = 5;
      await uiSettings.setDefaultTime({
        from: pageObjects.timePicker.defaultStartTime,
        to: pageObjects.timePicker.defaultEndTime,
      });
      await pageObjects.timePicker.startAutoRefresh(interval);

      const getRequestTimestamp = async () => {
        await pageObjects.inspector.open();
        const requestStats = await pageObjects.inspector.getTableData();
        const requestStatsRow = requestStats.filter(
          (r) => r && r[0] && r[0].includes('Request timestamp')
        );
        if (!requestStatsRow || !requestStatsRow[0] || !requestStatsRow[0][1]) {
          await pageObjects.inspector.close();
          return '';
        }
        await pageObjects.inspector.close();
        return requestStatsRow[0][1];
      };

      const requestTimestampBefore = await getRequestTimestamp();

      await expect
        .poll(
          async () => {
            const requestTimestampAfter = await getRequestTimestamp();
            return (
              Boolean(requestTimestampAfter) && requestTimestampBefore !== requestTimestampAfter
            );
          },
          { timeout: 30000 }
        )
        .toBe(true);
    });

    test('load query should show query name', async ({ pageObjects, uiSettings }) => {
      await uiSettings.setDefaultTime({
        from: pageObjects.timePicker.defaultStartTime,
        to: pageObjects.timePicker.defaultEndTime,
      });
      await pageObjects.discover.saveSearch(queryName2);
      await pageObjects.discover.loadSavedSearch(queryName2);
      await expect
        .poll(async () => await pageObjects.discover.getCurrentQueryName())
        .toBe(queryName2);
    });

    test('should show the correct hit count', async ({ pageObjects, uiSettings }) => {
      const expectedHitCount = '14,004';
      await uiSettings.setDefaultTime({
        from: pageObjects.timePicker.defaultStartTime,
        to: pageObjects.timePicker.defaultEndTime,
      });
      await expect
        .poll(async () => await pageObjects.discover.getHitCount())
        .toBe(expectedHitCount);
    });

    test('should show correct time range string in chart', async ({ pageObjects, uiSettings }) => {
      await uiSettings.setDefaultTime({
        from: pageObjects.timePicker.defaultStartTime,
        to: pageObjects.timePicker.defaultEndTime,
      });
      const actualTimeString = await pageObjects.discover.getChartTimespan();
      const expectedTimeString = `${pageObjects.timePicker.defaultStartTime} - ${pageObjects.timePicker.defaultEndTime} (interval: Auto - 30 seconds)`;
      expect(actualTimeString).toBe(expectedTimeString);
    });

    test('should modify the time range when a bar is clicked', async ({
      pageObjects,
      uiSettings,
    }) => {
      await uiSettings.setDefaultTime({
        from: pageObjects.timePicker.defaultStartTime,
        to: pageObjects.timePicker.defaultEndTime,
      });
      await pageObjects.discover.clickHistogramBar();
      await pageObjects.discover.waitUntilSearchingHasFinished();

      const time = await pageObjects.timePicker.getTimeConfig();
      expect(time.start).toBe('Sep 21, 2015 @ 09:00:00.000');
      expect(time.end).toBe('Sep 21, 2015 @ 12:00:00.000');

      await expect
        .poll(
          async () => {
            const rowData = await pageObjects.discover.getDocTableField(1);
            return rowData.includes('Sep 21, 2015 @ 11:59:22.316');
          },
          { timeout: 3000 }
        )
        .toBe(true);
    });

    test('should show correct initial chart interval of Auto', async ({
      page,
      pageObjects,
      uiSettings,
    }) => {
      await uiSettings.setDefaultTime({
        from: pageObjects.timePicker.defaultStartTime,
        to: pageObjects.timePicker.defaultEndTime,
      });
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await page.testSubj.click('discoverQueryHits'); // cancel out tooltips

      const actualInterval = await pageObjects.discover.getChartInterval();
      const expectedInterval = 'auto';
      expect(actualInterval).toBe(expectedInterval);
    });

    test('should show "no results"', async ({ pageObjects, uiSettings }) => {
      await uiSettings.setDefaultTime({
        from: pageObjects.timePicker.defaultStartTime,
        to: pageObjects.timePicker.endTimeNoResults,
      });
      await expect.poll(async () => await pageObjects.discover.hasNoResults()).toBe(true);
    });

    test('should suggest a new time range is picked', async ({ pageObjects, uiSettings }) => {
      await uiSettings.setDefaultTime({
        from: pageObjects.timePicker.defaultStartTime,
        to: pageObjects.timePicker.endTimeNoResults,
      });
      const isVisible = await pageObjects.discover.hasNoResultsTimepicker();
      expect(isVisible).toBe(true);
    });

    test('should show matches when time range is expanded', async ({ pageObjects, uiSettings }) => {
      await uiSettings.setDefaultTime({
        from: pageObjects.timePicker.defaultStartTime,
        to: pageObjects.timePicker.endTimeNoResults,
      });
      await pageObjects.discover.expandTimeRangeAsSuggestedInNoResultsMessage();

      await expect.poll(async () => await pageObjects.discover.hasNoResults()).toBe(false);
      await expect.poll(async () => await pageObjects.discover.getHitCountInt()).toBeGreaterThan(0);
    });
  });
});
