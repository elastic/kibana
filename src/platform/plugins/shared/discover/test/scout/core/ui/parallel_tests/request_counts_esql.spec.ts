/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

const ESQL_ENDPOINT = '/internal/search/esql_async';
const REQUEST_COUNT_OPTIONS = {
  endpoint: ESQL_ENDPOINT,
  method: 'POST',
  exactPathname: true,
} as const;

// Keeps the countMatchingRequests window open until the chart (Lens) fires its esql_async request.
const waitForChartRequest = (page: ScoutPage) =>
  page.waitForResponse((r) => r.url().includes(ESQL_ENDPOINT), { timeout: 10_000 }).catch(() => {});

spaceTest.describe(
  'Discover request counts - ES|QL mode',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace, scoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
      await scoutSpace.uiSettings.set({ 'discover:searchOnPageLoad': false });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects, page }) => {
      await browserAuth.loginAsPrivilegedUser();
      // goto sets ES|QL mode via localStorage (addInitScript) before page load, so the
      // page opens in ES|QL mode without clicking the language-switch button.
      // Calling selectTextBaseLang() here is intentionally avoided: on CI its
      // getCurrentQueryMode() race can misdetect 'classic' and click the button, which
      // dispatches a Redux transition that schedules a deferred re-fetch. That request
      // fires asynchronously after beforeEach returns, landing inside the test's
      // countMatchingRequests window and inflating the count from 2 to 3.
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.codeEditor.waitCodeEditorReady('ESQLEditor');
      // Activate the histogram: the first explicit submit loads the chart (Lens) so
      // subsequent submits in the test window fire both docs + chart requests.
      let initialCount = 0;
      const drainInitial = page.waitForResponse(
        (r) => r.url().includes(ESQL_ENDPOINT) && ++initialCount >= 2,
        { timeout: 30_000 }
      );
      await pageObjects.discover.submitQuery();
      await drainInitial;
    });

    spaceTest.afterAll(async ({ discoverScoutSpace, scoutSpace }) => {
      await scoutSpace.uiSettings.unset('discover:searchOnPageLoad');
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'should send 2 requests (documents + chart) on submit',
      async ({ page, pageObjects, network }) => {
        const count = await network.countMatchingRequests(REQUEST_COUNT_OPTIONS, async () => {
          await pageObjects.discover.submitQuery();
          await pageObjects.discover.waitUntilSearchingHasFinished();
          await waitForChartRequest(page);
        });
        expect(count).toBe(2);
      }
    );

    spaceTest(
      'should send 2 requests (documents + chart) when refreshing',
      async ({ page, pageObjects, network }) => {
        const count = await network.countMatchingRequests(REQUEST_COUNT_OPTIONS, async () => {
          await pageObjects.discover.submitQuery();
          await pageObjects.discover.waitUntilSearchingHasFinished();
          await waitForChartRequest(page);
        });
        expect(count).toBe(2);
      }
    );

    spaceTest(
      'should send 2 requests (documents + chart) when changing the query',
      async ({ page, pageObjects, network }) => {
        // The debounce auto-submit only fires the docs request; the chart only fires on explicit submit.
        // Change the query and drain docs outside the count window, then count the explicit submit.
        await pageObjects.discover.codeEditor.setCodeEditorValue(
          'from logstash-* | where bytes > 1000 '
        );
        await pageObjects.discover.waitUntilSearchingHasFinished();
        const count = await network.countMatchingRequests(REQUEST_COUNT_OPTIONS, async () => {
          await pageObjects.discover.submitQuery();
          await pageObjects.discover.waitUntilSearchingHasFinished();
          await waitForChartRequest(page);
        });
        expect(count).toBe(2);
      }
    );

    spaceTest(
      'should send 2 requests (documents + chart) when changing the time range',
      async ({ page, pageObjects, network }) => {
        const count = await network.countMatchingRequests(REQUEST_COUNT_OPTIONS, async () => {
          // Pre-register before the range change so neither the docs nor chart response can be missed.
          let esqlCount = 0;
          const waitForBoth = page.waitForResponse(
            (r) => r.url().includes(ESQL_ENDPOINT) && ++esqlCount >= 2,
            { timeout: 30_000 }
          );
          await pageObjects.datePicker.setAbsoluteRange({
            from: 'Sep 21, 2015 @ 06:31:44.000',
            to: 'Sep 23, 2015 @ 00:00:00.000',
          });
          await waitForBoth;
        });
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
      async ({ page, pageObjects, network }) => {
        // Hide chart, change time range (docs only), then show chart — should fire 1 chart request for the new range.
        await pageObjects.discover.hideChart();
        await pageObjects.datePicker.setAbsoluteRange({
          from: 'Sep 21, 2015 @ 06:31:44.000',
          to: 'Sep 24, 2015 @ 00:00:00.000',
        });
        await pageObjects.discover.waitUntilSearchingHasFinished();

        const count = await network.countMatchingRequests(REQUEST_COUNT_OPTIONS, async () => {
          await pageObjects.discover.showChart();
          await waitForChartRequest(page);
        });
        expect(count).toBe(1);
      }
    );
  }
);
