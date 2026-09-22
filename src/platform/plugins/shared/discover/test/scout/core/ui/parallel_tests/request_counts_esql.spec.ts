/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';
import { waitForRequestCount } from '../helpers/request_counts_shared';

const REQUEST_COUNT_OPTIONS = {
  endpoint: '/internal/search/esql_async',
  method: 'POST',
  exactPathname: true,
};

spaceTest.describe(
  'Discover request counts - ES|QL mode',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace, scoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
      await scoutSpace.uiSettings.set({ 'discover:searchOnPageLoad': false });
    });

    spaceTest.beforeEach(async ({ browserAuth, network, pageObjects, page }) => {
      await browserAuth.loginAsPrivilegedUser();
      // goto sets ES|QL mode via localStorage before load, so no language-switch click
      // is needed. selectTextBaseLang() is avoided on purpose: on CI its mode detection
      // can misfire and click the button, scheduling a deferred re-fetch that lands in
      // the test's count window and inflates it from 2 to 3.
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.codeEditor.waitCodeEditorReady('ESQLEditor');
      // Activate the histogram: the first explicit submit loads the chart (Lens) so
      // subsequent submits fire both docs + chart requests. Without it every test
      // here counts 1 instead of 2.
      let initialCount = 0;
      const drainInitial = page.waitForResponse(
        (response) =>
          network.matchesEndpoint(response.request(), REQUEST_COUNT_OPTIONS) && ++initialCount >= 2,
        { timeout: 30_000 }
      );
      await pageObjects.discover.submitQuery();
      await drainInitial;
      // The first response isn't completion: an async search answers immediately with
      // `is_running: true` and finishes over its polls. Leaving with searches in flight
      // makes showChart() re-request that data, so the "no requests" test counts 1
      // instead of 0. Settle on UI state, which covers the whole poll cycle.
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await page.testSubj.locator('unifiedHistogramRendered').waitFor({ state: 'visible' });
      await page.testSubj
        .locator('unifiedHistogramProgressBar')
        .waitFor({ state: 'hidden', timeout: 30_000 });
    });

    spaceTest.afterAll(async ({ discoverScoutSpace, scoutSpace }) => {
      await scoutSpace.uiSettings.unset('discover:searchOnPageLoad');
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'should send 2 requests (documents + chart) on submit',
      async ({ pageObjects, network }) => {
        const count = await network.trackMatchingRequests(
          REQUEST_COUNT_OPTIONS,
          async (getCount) => {
            await pageObjects.discover.submitQuery();
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
          }
        );
        expect(count).toBe(2);
      }
    );

    spaceTest(
      'should send 2 requests (documents + chart) when changing the query',
      async ({ pageObjects, network }) => {
        // The debounce auto-submit only fires the docs request, so drain it outside the
        // count window; the chart only fires on the explicit submit counted below.
        await pageObjects.discover.codeEditor.setCodeEditorValue(
          'from logstash-* | where bytes > 1000 '
        );
        await pageObjects.discover.waitUntilSearchingHasFinished();
        const count = await network.trackMatchingRequests(
          REQUEST_COUNT_OPTIONS,
          async (getCount) => {
            await pageObjects.discover.submitQuery();
            await waitForRequestCount(getCount, 2);
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
        // While the chart is hidden a time range change only fetches docs, so showing it
        // has to fetch the chart data for the new range.
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
          }
        );
        expect(count).toBe(1);
      }
    );
  }
);
