/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect, test } from '@kbn/scout';

const defaultSettings = {
  defaultIndex: 'logstash-*',
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
    await pageObjects.timePicker.setDefaultAbsoluteRange();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.clean({ types: ['search', 'index-pattern'] });
  });

  test.describe('query', () => {
    const queryName1 = 'Query # 1';

    test('should show correct time range string by timepicker', async ({ pageObjects }) => {
      const time = await pageObjects.timePicker.getTimeConfig();
      expect(time.start).toBe(pageObjects.timePicker.defaultStartTime);
      expect(time.end).toBe(pageObjects.timePicker.defaultEndTime);

      const rowData = await pageObjects.discover.getDocTableIndex(1);
      expect(rowData).toContain('Sep 22, 2015 @ 23:50:13.253');
    });

    test('save query should show toast message and display query name', async ({ pageObjects }) => {
      await pageObjects.discover.saveSearch(queryName1);
      const actualQueryNameString = await pageObjects.discover.getCurrentQueryName();
      expect(actualQueryNameString).toBe(queryName1);
    });

    test('load query should show query name', async ({ pageObjects }) => {
      await pageObjects.discover.loadSavedSearch(queryName1);

      await expect
        .poll(async () => await pageObjects.discover.getCurrentQueryName())
        .toBe(queryName1);
    });

    test('renaming a saved query should modify name in breadcrumb', async ({ pageObjects }) => {
      const queryName2 = 'Modified Query # 1';
      await pageObjects.discover.loadSavedSearch(queryName1);
      await pageObjects.discover.saveSearch(queryName2);

      await expect
        .poll(async () => await pageObjects.discover.getCurrentQueryName())
        .toBe(queryName2);
    });

    test('should show the correct hit count', async ({ pageObjects }) => {
      const expectedHitCount = '14,004';
      await expect
        .poll(async () => await pageObjects.discover.getHitCount())
        .toBe(expectedHitCount);
    });

    test('should show correct time range string in chart', async ({ pageObjects }) => {
      const actualTimeString = await pageObjects.discover.getChartTimespan();
      const expectedTimeString = `${pageObjects.timePicker.defaultStartTime} - ${pageObjects.timePicker.defaultEndTime} (interval: Auto - 3 hours)`;
      expect(actualTimeString).toBe(expectedTimeString);
    });

    test('should modify the time range when a bar is clicked', async ({ pageObjects }) => {
      await pageObjects.timePicker.setDefaultAbsoluteRange();
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

    test('should show correct initial chart interval of Auto', async ({ page, pageObjects }) => {
      await pageObjects.timePicker.setDefaultAbsoluteRange();
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await page.testSubj.click('discoverQueryHits'); // cancel out tooltips

      const actualInterval = await pageObjects.discover.getChartInterval();
      const expectedInterval = 'auto';
      expect(actualInterval).toBe(expectedInterval);
    });

    test('should not show "no results"', async ({ pageObjects }) => {
      const isVisible = await pageObjects.discover.hasNoResults();
      expect(isVisible).toBe(false);
    });

    test('should reload the saved search with persisted query to show the initial hit count', async ({
      pageObjects,
    }) => {
      await pageObjects.timePicker.setDefaultAbsoluteRange();
      await pageObjects.discover.waitUntilSearchingHasFinished();

      // Apply query changes
      await pageObjects.queryBar.setQuery('test');
      await pageObjects.queryBar.submitQuery();
      await expect.poll(async () => await pageObjects.discover.getHitCount()).toBe('22');

      // Reset to persisted state
      await pageObjects.queryBar.clearQuery();
      await pageObjects.discover.revertUnsavedChanges();

      const expectedHitCount = '14,004';
      await expect
        .poll(async () => {
          const queryString = await pageObjects.queryBar.getQueryString();
          const hitCount = await pageObjects.discover.getHitCount();
          return queryString === '' && hitCount === expectedHitCount;
        })
        .toBe(true);
    });

    test.describe('query #2, which has an empty time range', () => {
      const fromTime = 'Jun 11, 1999 @ 09:22:11.000';
      const toTime = 'Jun 12, 1999 @ 11:21:04.000';

      test.beforeEach(async ({ pageObjects }) => {
        await pageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        await pageObjects.discover.waitUntilSearchingHasFinished();
      });

      test('should show "no results"', async ({ pageObjects }) => {
        await expect.poll(async () => await pageObjects.discover.hasNoResults()).toBe(true);
      });

      test('should suggest a new time range is picked', async ({ pageObjects }) => {
        const isVisible = await pageObjects.discover.hasNoResultsTimepicker();
        expect(isVisible).toBe(true);
      });

      test('should show matches when time range is expanded', async ({ pageObjects }) => {
        await pageObjects.discover.expandTimeRangeAsSuggestedInNoResultsMessage();

        await expect.poll(async () => await pageObjects.discover.hasNoResults()).toBe(false);
        await expect
          .poll(async () => await pageObjects.discover.getHitCountInt())
          .toBeGreaterThan(0);
      });
    });

    test.describe('nested query', () => {
      test.beforeEach(async ({ pageObjects }) => {
        await pageObjects.timePicker.setDefaultAbsoluteRange();
        await pageObjects.discover.waitUntilSearchingHasFinished();
      });

      test('should support querying on nested fields', async ({ page, pageObjects }) => {
        await pageObjects.queryBar.setQuery('nestedField:{ child: nestedValue }');
        await pageObjects.queryBar.submitQuery();

        await page.waitForLoadingIndicatorHidden();
        await pageObjects.discover.waitUntilSearchingHasFinished();

        await expect.poll(async () => await pageObjects.discover.getHitCount()).toBe('1');
      });
    });
    test.describe('data-shared-item', () => {
      test('should have correct data-shared-item title and description', async ({
        pageObjects,
      }) => {
        const expected = {
          title: 'A Saved Search',
          description: 'A Saved Search Description',
        };

        await pageObjects.discover.loadSavedSearch(expected.title);
        const { title, description } =
          await pageObjects.discover.getSharedItemTitleAndDescription();

        expect(title).toBe(expected.title);
        expect(description).toBe(expected.description);
      });
    });

    test.describe('time zone switch', () => {
      test('should show bars in the correct time zone after switching', async ({
        kbnClient,
        browserAuth,
        page,
        pageObjects,
      }) => {
        await kbnClient.uiSettings.update({ 'dateFormat:tz': 'America/Phoenix' });
        await browserAuth.loginAsAdmin();
        await pageObjects.discover.goto();
        await page.waitForLoadingIndicatorHidden();
        await pageObjects.discover.waitUntilSearchingHasFinished();

        await pageObjects.timePicker.setDefaultAbsoluteRange();
        await page.waitForLoadingIndicatorHidden();
        await pageObjects.discover.waitUntilSearchingHasFinished();

        await pageObjects.queryBar.clearQuery();
        await page.waitForLoadingIndicatorHidden();
        await pageObjects.discover.waitUntilSearchingHasFinished();

        const rowData = await pageObjects.discover.getDocTableIndex(1);
        expect(rowData.startsWith('Sep 22, 2015 @ 16:50:13.253')).toBe(true);
      });
    });

    test.describe('invalid time range in URL', () => {
      test('should get the default timerange', async ({ page, browserAuth, pageObjects }) => {
        await browserAuth.loginAsAdmin();
        await page.goto('app/discover#/?_g=(time:(from:now-15m,to:null))');
        await page.waitForLoadingIndicatorHidden();

        const time = await pageObjects.timePicker.getTimeConfig();
        expect(time.start).toBe('~ 15 minutes ago');
        expect(time.end).toBe('now');
      });
    });

    test.describe('managing fields', () => {
      test('should add a field, sort by it, remove it and also sorting by it', async ({
        page,
        kbnClient,
        browserAuth,
        pageObjects,
      }) => {
        await kbnClient.uiSettings.update({
          'timepicker:timeDefaults': `{ "from": "2015-09-19T06:31:44.000Z", "to": "2015-09-23T18:31:44.000Z"}`,
        });
        await browserAuth.loginAsAdmin();
        await pageObjects.discover.goto();

        await pageObjects.unifiedFieldList.clickFieldListItemAdd('_score');
        await pageObjects.discover.clickFieldSort('_score', 'Sort Low-High');

        const currentUrlWithScore = page.url();
        expect(currentUrlWithScore).toContain('_score');

        await pageObjects.unifiedFieldList.clickFieldListItemRemove('_score');
        const currentUrlWithoutScore = page.url();
        expect(currentUrlWithoutScore).not.toContain('_score');
      });
      test('should add a field with customLabel, sort by it, display it correctly', async ({
        page,
        kbnClient,
        browserAuth,
        pageObjects,
      }) => {
        await kbnClient.uiSettings.update({
          'timepicker:timeDefaults': `{ "from": "2015-09-19T06:31:44.000Z", "to": "2015-09-23T18:31:44.000Z"}`,
        });
        await browserAuth.loginAsAdmin();
        await pageObjects.discover.goto();

        await pageObjects.unifiedFieldList.clickFieldListItemAdd('referer');
        await pageObjects.discover.clickFieldSort('referer', 'Sort A-Z');

        const docHeader = await pageObjects.discover.getDocHeader();
        expect(docHeader).toContain('Referer custom');

        const fieldNames = await pageObjects.unifiedFieldList.getAllFieldNames();
        expect(fieldNames).toContain('Referer custom');

        const url = page.url();
        expect(url).toContain('referer');
      });
    });

    test.describe('refresh interval', () => {
      test('should refetch when autofresh is enabled', async ({ pageObjects }) => {
        const intervalS = 5;
        await pageObjects.timePicker.startAutoRefresh(intervalS);

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
      test.afterEach(async ({ pageObjects }) => {
        await pageObjects.inspector.close();
        await pageObjects.timePicker.pauseAutoRefresh();
      });
    });

    test.describe('resizable layout panels', () => {
      test('should allow resizing the histogram layout panels', async ({ page }) => {
        const resizeDistance = 100;
        const topPanel = page.testSubj.locator('unifiedHistogramResizablePanelFixed');
        const mainPanel = page.testSubj.locator('unifiedHistogramResizablePanelFlex');
        const resizeButton = page.testSubj.locator('unifiedHistogramResizableButton');

        const topPanelBox = await topPanel.boundingBox();
        const mainPanelBox = await mainPanel.boundingBox();

        if (!topPanelBox || !mainPanelBox) {
          throw new Error('Panel boxes not found');
        }

        const topPanelSize = topPanelBox.height;
        const mainPanelSize = mainPanelBox.height;

        await resizeButton.dragTo(resizeButton, {
          targetPosition: { x: 0, y: resizeDistance },
        });

        const newTopPanelBox = await topPanel.boundingBox();
        const newMainPanelBox = await mainPanel.boundingBox();

        if (!newTopPanelBox || !newMainPanelBox) {
          throw new Error('New panel boxes not found');
        }

        const newTopPanelSize = newTopPanelBox.height;
        const newMainPanelSize = newMainPanelBox.height;

        expect(Math.abs(newTopPanelSize - (topPanelSize + resizeDistance))).toBeLessThan(5);
        expect(Math.abs(newMainPanelSize - (mainPanelSize - resizeDistance))).toBeLessThan(5);
      });

      test('should allow resizing the sidebar layout panels', async ({ page }) => {
        const resizeDistance = 100;
        const leftPanel = page.testSubj.locator('discoverLayoutResizablePanelFixed');
        const mainPanel = page.testSubj.locator('discoverLayoutResizablePanelFlex');
        const resizeButton = page.testSubj.locator('discoverLayoutResizableButton');

        const leftPanelBox = await leftPanel.boundingBox();
        const mainPanelBox = await mainPanel.boundingBox();

        if (!leftPanelBox || !mainPanelBox) {
          throw new Error('Panel boxes not found');
        }

        const leftPanelSize = leftPanelBox.width;
        const mainPanelSize = mainPanelBox.width;

        await resizeButton.dragTo(resizeButton, {
          targetPosition: { x: resizeDistance, y: 0 },
        });

        const newLeftPanelBox = await leftPanel.boundingBox();
        const newMainPanelBox = await mainPanel.boundingBox();

        if (!newLeftPanelBox || !newMainPanelBox) {
          throw new Error('New panel boxes not found');
        }

        const newLeftPanelSize = newLeftPanelBox.width;
        const newMainPanelSize = newMainPanelBox.width;

        expect(Math.abs(newLeftPanelSize - (leftPanelSize + resizeDistance))).toBeLessThan(5);
        expect(Math.abs(newMainPanelSize - (mainPanelSize - resizeDistance))).toBeLessThan(5);
      });
    });
  });
});
