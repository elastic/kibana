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

const ESQL_ENDPOINT = '/internal/search/esql_async';
const REQUEST_COUNT_OPTIONS = {
  method: 'POST',
  exactPathname: true,
} as const;

spaceTest.describe('Discover request counts - ES|QL mode', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace, scoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
    // ES|QL mode does not trigger a search on page load by default in these tests
    await scoutSpace.uiSettings.set({ 'discover:searchOnPageLoad': false });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'esql' });
    await pageObjects.discover.selectTextBaseLang();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace, scoutSpace }) => {
    await scoutSpace.uiSettings.unset('discover:searchOnPageLoad');
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('ES|QL mode request counts', async ({ page, pageObjects, network }) => {
    // This test collapses the 7 scenarios of the original FTR suite (which shared one browser
    // session) into a single test, so it needs more than the default 60s budget — CI serverless
    // runs exceed it on esql_async searches alone.
    spaceTest.setTimeout(120_000);

    // In ES|QL mode the chart (Lens) fires its esql_async request as a React effect that runs
    // after the docs response is processed — i.e. after waitUntilSearchingHasFinished() returns.
    // Awaiting a waitForResponse for the chart endpoint after the docs wait keeps the
    // network.countMatchingRequests listener alive long enough to capture both requests.
    const waitForChartRequest = () =>
      page
        .waitForResponse((r) => r.url().includes(ESQL_ENDPOINT), { timeout: 10_000 })
        .catch(() => {});

    // setCodeEditorValue fires onDidChangeContent which Discover auto-submits after a debounce.
    // Waiting for the search to finish ensures that debounced request completes and is not
    // captured by the next network.countMatchingRequests listener.
    const resetQuery = async () => {
      await pageObjects.discover.codeEditor.setCodeEditorValue(
        'from logstash-* | where bytes > 1000 '
      );
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await waitForChartRequest();
    };

    await spaceTest.step('should send 2 requests (documents + chart) on submit', async () => {
      await resetQuery();
      const count = await network.countMatchingRequests(
        ESQL_ENDPOINT,
        async () => {
          await pageObjects.discover.submitQuery();
          await pageObjects.discover.waitUntilSearchingHasFinished();
          await waitForChartRequest();
        },
        REQUEST_COUNT_OPTIONS
      );
      expect(count).toBe(2);
    });

    await spaceTest.step('should send 2 requests (documents + chart) when refreshing', async () => {
      // No resetQuery here — tests that re-submitting an already-set query fires new requests
      const count = await network.countMatchingRequests(
        ESQL_ENDPOINT,
        async () => {
          await pageObjects.discover.submitQuery();
          await pageObjects.discover.waitUntilSearchingHasFinished();
          await waitForChartRequest();
        },
        REQUEST_COUNT_OPTIONS
      );
      expect(count).toBe(2);
    });

    await spaceTest.step(
      'should send 2 requests (documents + chart) when changing the query',
      async () => {
        const count = await network.countMatchingRequests(
          ESQL_ENDPOINT,
          async () => {
            await pageObjects.discover.codeEditor.setCodeEditorValue(
              'from logstash-* | where bytes > 1000 '
            );
            await pageObjects.discover.submitQuery();
            await pageObjects.discover.waitUntilSearchingHasFinished();
            await waitForChartRequest();
          },
          REQUEST_COUNT_OPTIONS
        );
        expect(count).toBe(2);
      }
    );

    await spaceTest.step(
      'should send 2 requests (documents + chart) when changing the time range',
      async () => {
        await resetQuery();
        const count = await network.countMatchingRequests(
          ESQL_ENDPOINT,
          async () => {
            await pageObjects.datePicker.setAbsoluteRange({
              from: 'Sep 21, 2015 @ 06:31:44.000',
              to: 'Sep 23, 2015 @ 00:00:00.000',
            });
            await pageObjects.discover.waitUntilSearchingHasFinished();
            await waitForChartRequest();
          },
          REQUEST_COUNT_OPTIONS
        );
        expect(count).toBe(2);
      }
    );

    await spaceTest.step('should send no requests when toggling the chart visibility', async () => {
      await resetQuery();
      const count = await network.countMatchingRequests(
        ESQL_ENDPOINT,
        async () => {
          await pageObjects.discover.hideChart();
          await pageObjects.discover.showChart();
        },
        REQUEST_COUNT_OPTIONS
      );
      expect(count).toBe(0);
    });

    await spaceTest.step(
      'should send a request for chart data when showing the chart after a time range change',
      async () => {
        await pageObjects.discover.hideChart();
        await pageObjects.datePicker.setAbsoluteRange({
          from: 'Sep 21, 2015 @ 06:31:44.000',
          to: 'Sep 24, 2015 @ 00:00:00.000',
        });
        await pageObjects.discover.waitUntilSearchingHasFinished();

        const count = await network.countMatchingRequests(
          ESQL_ENDPOINT,
          async () => {
            await pageObjects.discover.showChart();
            await waitForChartRequest();
          },
          REQUEST_COUNT_OPTIONS
        );
        expect(count).toBe(1);
      }
    );

    await spaceTest.step('should send expected requests for saved search changes', async () => {
      await pageObjects.discover.codeEditor.setCodeEditorValue(
        'from logstash-* | where bytes > 1000 '
      );
      await pageObjects.discover.submitQuery();
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await waitForChartRequest();
      await pageObjects.datePicker.setAbsoluteRange({
        from: 'Sep 21, 2015 @ 06:31:44.000',
        to: 'Sep 23, 2015 @ 00:00:00.000',
      });
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await waitForChartRequest();

      const saveCount = await network.countMatchingRequests(
        ESQL_ENDPOINT,
        async () => {
          await pageObjects.discover.saveSearch('esql test');
        },
        REQUEST_COUNT_OPTIONS
      );
      expect(saveCount).toBe(0);

      await pageObjects.discover.codeEditor.setCodeEditorValue(
        'from logstash-* | where bytes < 2000 '
      );
      await pageObjects.discover.submitQuery();
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await waitForChartRequest();

      const revertCount = await network.countMatchingRequests(
        ESQL_ENDPOINT,
        async () => {
          await pageObjects.discover.revertUnsavedChanges();
          await pageObjects.discover.waitUntilSearchingHasFinished();
          await waitForChartRequest();
        },
        REQUEST_COUNT_OPTIONS
      );
      expect(revertCount).toBe(2);

      const newSearchCount = await network.countMatchingRequests(
        ESQL_ENDPOINT,
        async () => {
          await pageObjects.discover.clickNewSearch();
          await pageObjects.discover.submitQuery();
          await pageObjects.discover.waitUntilSearchingHasFinished();
          await waitForChartRequest();
        },
        REQUEST_COUNT_OPTIONS
      );
      expect(newSearchCount).toBe(2);

      const loadCount = await network.countMatchingRequests(
        ESQL_ENDPOINT,
        async () => {
          await pageObjects.discover.loadSavedSearch('esql test');
          await pageObjects.discover.waitUntilSearchingHasFinished();
          await waitForChartRequest();
        },
        REQUEST_COUNT_OPTIONS
      );
      expect(loadCount).toBe(2);
    });
  });
});
