/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';
import { waitForRequestCount } from '../helpers/request_counts_shared';

const LONG_WINDOW_LOGSTASH_KBN_ARCHIVE =
  'src/platform/test/functional/fixtures/kbn_archiver/long_window_logstash_index_pattern';

const REQUEST_COUNT_OPTIONS = {
  endpoint: '/internal/search/ese',
  method: 'POST',
  exactPathname: true,
};

spaceTest.describe(
  'Discover request counts - data view mode',
  { tag: tags.deploymentAgnostic },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace, scoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
      await scoutSpace.savedObjects.load(LONG_WINDOW_LOGSTASH_KBN_ARCHIVE);
    });

    spaceTest.beforeEach(async ({ browserAuth, network, pageObjects, page }) => {
      await browserAuth.loginAsPrivilegedUser();
      const histogramProgressBar = page.testSubj.locator('unifiedHistogramProgressBar');
      let eseCount = 0;
      const drainInitialLoad = page
        .waitForResponse(
          (response) =>
            network.matchesEndpoint(response.request(), REQUEST_COUNT_OPTIONS) && ++eseCount >= 2,
          { timeout: 30_000 }
        )
        .catch(() => {});
      await pageObjects.discover.goto({ queryMode: 'classic' });
      const progressBarStarted = histogramProgressBar
        .waitFor({ state: 'visible', timeout: 2_000 })
        .catch(() => {});
      await drainInitialLoad;
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await page.testSubj.locator('unifiedHistogramRendered').waitFor({ state: 'visible' });
      await progressBarStarted;
      await histogramProgressBar.waitFor({ state: 'hidden', timeout: 30_000 });
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'should send 2 search requests (documents + chart) on page load',
      async ({ page, network }) => {
        const count = await network.trackMatchingRequests(
          REQUEST_COUNT_OPTIONS,
          async (getCount) => {
            await page.reload();
            await waitForRequestCount(getCount, 2);
          }
        );
        expect(count).toBe(2);
      }
    );

    spaceTest(
      'should send 2 requests (documents + chart) when refreshing',
      async ({ pageObjects, network }) => {
        const count = await network.trackMatchingRequests(
          REQUEST_COUNT_OPTIONS,
          async (getCount) => {
            await pageObjects.discover.submitQuery();
            await waitForRequestCount(getCount, 2);
            await pageObjects.discover.waitUntilSearchingHasFinished();
          }
        );
        expect(count).toBe(2);
      }
    );

    spaceTest(
      'should send 2 requests (documents + chart) when changing the query',
      async ({ pageObjects, network }) => {
        const count = await network.trackMatchingRequests(
          REQUEST_COUNT_OPTIONS,
          async (getCount) => {
            await pageObjects.queryBar.setQuery('bytes > 1000');
            await pageObjects.discover.submitQuery();
            await waitForRequestCount(getCount, 2);
            await pageObjects.discover.waitUntilSearchingHasFinished();
          }
        );
        expect(count).toBe(2);
      }
    );

    spaceTest(
      'should send 2 requests (documents + chart) when changing the time range',
      async ({ pageObjects, network }) => {
        const count = await network.trackMatchingRequests(
          REQUEST_COUNT_OPTIONS,
          async (getCount) => {
            await pageObjects.datePicker.setAbsoluteRange({
              from: 'Sep 21, 2015 @ 06:31:44.000',
              to: 'Sep 23, 2015 @ 00:00:00.000',
            });
            await waitForRequestCount(getCount, 2);
            await pageObjects.discover.waitUntilSearchingHasFinished();
          }
        );
        expect(count).toBe(2);
      }
    );

    spaceTest(
      'should send no requests when toggling the chart visibility',
      async ({ pageObjects, network }) => {
        const count = await network.countMatchingRequests(REQUEST_COUNT_OPTIONS, async () => {
          await pageObjects.discover.hideChart();
          await pageObjects.discover.showChart();
        });
        expect(count).toBe(0);
      }
    );

    spaceTest(
      'should send a request for chart data when showing the chart after a time range change',
      async ({ pageObjects, network }) => {
        await pageObjects.discover.hideChart();
        await pageObjects.datePicker.setAbsoluteRange({
          from: 'Sep 21, 2015 @ 06:31:44.000',
          to: 'Sep 24, 2015 @ 00:00:00.000',
        });
        await pageObjects.discover.waitUntilSearchingHasFinished();

        const count = await network.trackMatchingRequests(
          REQUEST_COUNT_OPTIONS,
          async (getCount) => {
            await pageObjects.discover.showChart();
            await waitForRequestCount(getCount, 1);
            await pageObjects.discover.waitUntilSearchingHasFinished();
          }
        );
        expect(count).toBe(1);
      }
    );

    spaceTest(
      'should send expected requests for saved search changes',
      async ({ pageObjects, network }) => {
        await pageObjects.queryBar.setQuery('bytes > 1000');
        await pageObjects.discover.submitQuery();
        await pageObjects.datePicker.setAbsoluteRange({
          from: 'Sep 21, 2015 @ 06:31:44.000',
          to: 'Sep 23, 2015 @ 00:00:00.000',
        });
        await pageObjects.discover.waitUntilSearchingHasFinished();

        const saveCount = await network.countMatchingRequests(REQUEST_COUNT_OPTIONS, async () => {
          await pageObjects.discover.saveSearch('data view test');
        });
        expect(saveCount).toBe(0);

        await pageObjects.queryBar.setQuery('bytes < 2000');
        await pageObjects.discover.submitQuery();
        await pageObjects.discover.waitUntilSearchingHasFinished();

        const revertCount = await network.trackMatchingRequests(
          REQUEST_COUNT_OPTIONS,
          async (getCount) => {
            await pageObjects.discover.revertUnsavedChanges();
            await waitForRequestCount(getCount, 2);
            await pageObjects.discover.waitUntilSearchingHasFinished();
          }
        );
        expect(revertCount).toBe(2);

        const newSearchCount = await network.trackMatchingRequests(
          REQUEST_COUNT_OPTIONS,
          async (getCount) => {
            await pageObjects.discover.clickNewSearch();
            await waitForRequestCount(getCount, 2);
            await pageObjects.discover.waitUntilSearchingHasFinished();
          }
        );
        expect(newSearchCount).toBe(2);

        const loadCount = await network.trackMatchingRequests(
          REQUEST_COUNT_OPTIONS,
          async (getCount) => {
            await pageObjects.discover.loadSavedSearch('data view test');
            await waitForRequestCount(getCount, 2);
            await pageObjects.discover.waitUntilSearchingHasFinished();
          }
        );
        expect(loadCount).toBe(2);
      }
    );

    spaceTest(
      'should send 2 requests (documents + chart) when adding a filter',
      async ({ pageObjects, network }) => {
        const count = await network.trackMatchingRequests(
          REQUEST_COUNT_OPTIONS,
          async (getCount) => {
            await pageObjects.filterBar.addFilter({
              field: 'extension',
              operator: 'is',
              value: 'jpg',
            });
            await waitForRequestCount(getCount, 2);
            await pageObjects.discover.waitUntilSearchingHasFinished();
          }
        );
        expect(count).toBe(2);
      }
    );

    spaceTest(
      'should send 2 requests (documents + chart) when sorting',
      async ({ page, pageObjects, network }) => {
        const count = await network.trackMatchingRequests(
          REQUEST_COUNT_OPTIONS,
          async (getCount) => {
            await pageObjects.dataGrid.openColumnMenuByField('@timestamp');
            await page.testSubj
              .locator('dataGridHeaderCellActionGroup-@timestamp')
              .getByRole('button', { name: 'Sort Old-New' })
              .click();
            await waitForRequestCount(getCount, 2);
            await pageObjects.discover.waitUntilSearchingHasFinished();
          }
        );
        expect(count).toBe(2);
      }
    );

    spaceTest(
      'should send 1 request (chart) when changing to a breakdown field without an other bucket',
      async ({ pageObjects, network }) => {
        const count = await network.trackMatchingRequests(
          REQUEST_COUNT_OPTIONS,
          async (getCount) => {
            await pageObjects.discover.chooseBreakdownField('type');
            await waitForRequestCount(getCount, 1);
            await pageObjects.discover.waitUntilSearchingHasFinished();
          }
        );
        expect(count).toBe(1);
      }
    );

    spaceTest(
      'should send 2 requests (chart + other bucket) when changing to a breakdown field with an other bucket',
      async ({ pageObjects, network }) => {
        const count = await network.trackMatchingRequests(
          REQUEST_COUNT_OPTIONS,
          async (getCount) => {
            await pageObjects.discover.chooseBreakdownField('geo.src');
            await waitForRequestCount(getCount, 2);
            await pageObjects.discover.waitUntilSearchingHasFinished();
          }
        );
        expect(count).toBe(2);
      }
    );

    spaceTest(
      'should send 1 request (chart) when changing the chart interval',
      async ({ pageObjects, network }) => {
        const count = await network.trackMatchingRequests(
          REQUEST_COUNT_OPTIONS,
          async (getCount) => {
            await pageObjects.discover.setChartInterval('Day');
            await waitForRequestCount(getCount, 1);
            await pageObjects.discover.waitUntilSearchingHasFinished();
          }
        );
        expect(count).toBe(1);
      }
    );

    spaceTest(
      'should send 2 requests (documents + chart) when changing the data view',
      async ({ pageObjects, network }) => {
        const count = await network.trackMatchingRequests(
          REQUEST_COUNT_OPTIONS,
          async (getCount) => {
            await pageObjects.discover.selectDataView('long-window-logstash-*');
            await waitForRequestCount(getCount, 2);
            await pageObjects.discover.waitUntilSearchingHasFinished();
          }
        );
        expect(count).toBe(2);
      }
    );
  }
);
