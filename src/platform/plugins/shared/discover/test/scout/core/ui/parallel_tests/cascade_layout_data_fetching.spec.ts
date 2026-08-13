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
 * when it hasn't already been fetched, and that an in-flight fetch survives a
 * quick tab switch away and back. Protects against performance regressions
 * (unnecessary refetching) rather than data correctness.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../common/ui/fixtures';
import { runCascadeQuery } from '../../../common/ui/fixtures/helpers';

const STATS_QUERY =
  'FROM logstash-* | STATS count = COUNT(bytes), average = AVG(memory) BY clientip';
const ESQL_ASYNC_ENDPOINT = '/internal/search/esql_async';

spaceTest.describe(
  'Discover cascade layout - data fetching',
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
      'does not refetch when returning to a previously expanded group',
      async ({ pageObjects, network }) => {
        const { discover } = pageObjects;

        expect(await runCascadeQuery(pageObjects, STATS_QUERY)).toBe(true);

        const [firstRowId, secondRowId] = await discover.getCascadeLayoutVisibleRowIds();

        await spaceTest.step('expanding a group fetches its row data', async () => {
          expect(
            await network.countMatchingRequests({ endpoint: ESQL_ASYNC_ENDPOINT }, () =>
              discover.toggleCascadeLayoutRow(firstRowId)
            )
          ).toBeGreaterThan(0);
        });

        await spaceTest.step('collapsing a group does not fetch', async () => {
          expect(
            await network.countMatchingRequests({ endpoint: ESQL_ASYNC_ENDPOINT }, () =>
              discover.toggleCascadeLayoutRow(firstRowId)
            )
          ).toBe(0);
        });

        await spaceTest.step('expanding a different group fetches its row data', async () => {
          expect(
            await network.countMatchingRequests({ endpoint: ESQL_ASYNC_ENDPOINT }, () =>
              discover.toggleCascadeLayoutRow(secondRowId)
            )
          ).toBeGreaterThan(0);
        });

        await spaceTest.step('collapsing the second group does not fetch', async () => {
          expect(
            await network.countMatchingRequests({ endpoint: ESQL_ASYNC_ENDPOINT }, () =>
              discover.toggleCascadeLayoutRow(secondRowId)
            )
          ).toBe(0);
        });

        await spaceTest.step(
          're-expanding the first (already-fetched) group does not refetch',
          async () => {
            expect(
              await network.countMatchingRequests({ endpoint: ESQL_ASYNC_ENDPOINT }, () =>
                discover.toggleCascadeLayoutRow(firstRowId)
              )
            ).toBe(0);
          }
        );
      }
    );

    spaceTest(
      'does not refetch when re-expanding a group after switching tabs',
      async ({ pageObjects, network }) => {
        const { discover, unifiedTabs } = pageObjects;

        expect(await runCascadeQuery(pageObjects, STATS_QUERY)).toBe(true);
        const [firstRowId] = await discover.getCascadeLayoutVisibleRowIds();

        await spaceTest.step('expand and collapse a group in the first tab', async () => {
          expect(
            await network.countMatchingRequests({ endpoint: ESQL_ASYNC_ENDPOINT }, () =>
              discover.toggleCascadeLayoutRow(firstRowId)
            )
          ).toBeGreaterThan(0);
          expect(
            await network.countMatchingRequests({ endpoint: ESQL_ASYNC_ENDPOINT }, () =>
              discover.toggleCascadeLayoutRow(firstRowId)
            )
          ).toBe(0);
        });

        await spaceTest.step('run the same query in a new tab and expand a group', async () => {
          await unifiedTabs.createNewTab();
          expect(await runCascadeQuery(pageObjects, STATS_QUERY)).toBe(true);
          const [secondTabRowId] = await discover.getCascadeLayoutVisibleRowIds();

          expect(
            await network.countMatchingRequests({ endpoint: ESQL_ASYNC_ENDPOINT }, () =>
              discover.toggleCascadeLayoutRow(secondTabRowId)
            )
          ).toBeGreaterThan(0);
        });

        await spaceTest.step(
          'switching back to the first tab and re-expanding does not refetch',
          async () => {
            await unifiedTabs.selectTab(0);
            await discover.waitUntilTabIsLoaded();

            expect(
              await network.countMatchingRequests({ endpoint: ESQL_ASYNC_ENDPOINT }, () =>
                discover.toggleCascadeLayoutRow(firstRowId)
              )
            ).toBe(0);
          }
        );
      }
    );

    spaceTest(
      'keeps an expanded row fetch active when switching tabs quickly',
      async ({ page, pageObjects, network }) => {
        const { dataGrid, discover, unifiedTabs } = pageObjects;

        expect(await runCascadeQuery(pageObjects, STATS_QUERY)).toBe(true);
        await unifiedTabs.createNewTab();
        expect(await runCascadeQuery(pageObjects, STATS_QUERY)).toBe(true);

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        const [firstRowId] = await discover.getCascadeLayoutVisibleRowIds();

        await network.trackMatchingRequests(
          { endpoint: ESQL_ASYNC_ENDPOINT },
          async (getRequestCount) => {
            // Click without waiting for expansion so the fetch starts before switching
            // away and returning to this tab.
            const initialRequest = page.waitForRequest((request) =>
              request.url().includes(ESQL_ASYNC_ENDPOINT)
            );
            await discover.clickCascadeRowToggle(firstRowId);
            await unifiedTabs.selectTab(1);
            await initialRequest;

            const requestCountBeforeReturning = getRequestCount();
            expect(requestCountBeforeReturning).toBeGreaterThan(0);

            await unifiedTabs.selectTab(0);
            await discover.waitUntilTabIsLoaded();

            expect(await discover.isCascadeLayoutRowExpanded(firstRowId)).toBe(true);
            await dataGrid.waitForDocTableRendered();

            expect(getRequestCount()).toBe(requestCountBeforeReturning);
          }
        );
      }
    );
  }
);
