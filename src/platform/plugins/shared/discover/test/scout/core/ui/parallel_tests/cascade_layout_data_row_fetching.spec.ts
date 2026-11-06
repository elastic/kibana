/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Verifies that expanding/collapsing cascade rows only fetches ES|QL row data
 * when it hasn't already been fetched, and that an in-flight fetch survives
 * switching away from and back to its tab. Protects against performance
 * regressions (unnecessary refetching) rather than data correctness.
 */

import { setTimeout as delay } from 'timers/promises';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../common/ui/fixtures';
import { runCascadeQuery } from '../../../common/ui/fixtures/helpers';

const STATS_QUERY =
  'FROM logstash-* | STATS count = COUNT(bytes), average = AVG(memory) BY clientip';
const ESQL_ASYNC_ENDPOINT = '/internal/search/esql_async';
// Long enough to cover expanding the row, persisting that expansion and switching
// tabs, so the held back row fetch is still in flight once the tab is left.
const ROW_FETCH_RESPONSE_DELAY_MS = 3_000;

spaceTest.describe(
  'Discover cascade layout - row data fetching',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'keeps a row fetch alive when switching away from its tab while it is in flight',
      async ({ page, pageObjects, network }) => {
        const { dataGrid, discover, unifiedTabs } = pageObjects;

        expect(await runCascadeQuery(pageObjects, STATS_QUERY)).toBe(true);
        await unifiedTabs.createNewTab();
        expect(await runCascadeQuery(pageObjects, STATS_QUERY)).toBe(true);

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        const [firstRowId] = await discover.getCascadeLayoutVisibleRowIds();

        // Hold back the response of the row fetch triggered below so that the fetch is
        // guaranteed to still be in flight when this tab is left, which is the scenario
        // under test. Without it the fetch usually resolves first and the test silently
        // degrades into the already covered "expand, switch tabs, return" case.
        await page.route(
          (url) => url.pathname.includes(ESQL_ASYNC_ENDPOINT),
          async (route) => {
            await delay(ROW_FETCH_RESPONSE_DELAY_MS);
            await route.continue();
          },
          { times: 1 }
        );

        await network.trackMatchingRequests(
          { endpoint: ESQL_ASYNC_ENDPOINT },
          async (getRequestCount) => {
            const rowFetchRequest = page.waitForRequest((request) =>
              request.url().includes(ESQL_ASYNC_ENDPOINT)
            );
            const rowFetchResponse = page.waitForResponse((response) =>
              response.url().includes(ESQL_ASYNC_ENDPOINT)
            );

            await discover.clickCascadeRowToggle(firstRowId);
            await rowFetchRequest;
            await discover.waitForCascadeLayoutRowExpanded(firstRowId, true);
            // The expansion only reaches the tab's restorable state through a
            // debounced subscription that is cancelled on unmount, so leaving the tab
            // before it fires drops the expansion and restores stale state on return.
            await discover.waitForCascadeStatePersisted();

            await unifiedTabs.selectTab(1);
            // The fetch left behind has to complete while its tab is in the background:
            // returning to a row whose data is still pending legitimately refetches.
            await rowFetchResponse;

            const requestCountBeforeReturning = getRequestCount();
            expect(requestCountBeforeReturning).toBeGreaterThan(0);

            await unifiedTabs.selectTab(0);
            await discover.waitUntilTabIsLoaded();
            await discover.waitForCascadeLayoutStable();

            expect(await discover.isCascadeLayoutRowExpanded(firstRowId)).toBe(true);
            await dataGrid.waitForDocTableRendered();

            expect(getRequestCount()).toBe(requestCountBeforeReturning);
          }
        );
      }
    );
  }
);
