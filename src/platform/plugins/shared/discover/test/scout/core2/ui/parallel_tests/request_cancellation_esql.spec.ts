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

const INITIAL_QUERY = 'from logstash-* | limit 10';
const CANCELLED_QUERY = 'from logstash-* | limit 5';

// Search start only: holding it means the cancel lands before Elasticsearch has returned an
// async search id, so the request rejects instead of resolving with partial results.
const isEsqlSearchStart = (url: URL) => url.pathname.endsWith('/internal/search/esql_async');

/** Holds every ES|QL search start at the network layer until the returned function is called. */
const holdEsqlSearchStart = async (page: ScoutPage) => {
  let release: () => void = () => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });

  await page.route(isEsqlSearchStart, async (route) => {
    await released;
    // The browser has already aborted the request when the test cancelled it
    await route.continue().catch(() => {});
  });

  return release;
};

spaceTest.describe(
  'Discover request cancellation - ES|QL mode',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace, scoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
      await scoutSpace.uiSettings.set({ 'discover:searchOnPageLoad': false });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.esqlEditor.waitReady();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace, scoutSpace }) => {
      await scoutSpace.uiSettings.unset('discover:searchOnPageLoad');
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'settles out of loading when the first query is cancelled on an empty Discover',
      async ({ page, pageObjects }) => {
        const { discover, esqlEditor } = pageObjects;
        const releaseSearch = await holdEsqlSearchStart(page);

        try {
          await esqlEditor.setQuery(CANCELLED_QUERY);
          const searchHeld = page.waitForRequest((request) =>
            isEsqlSearchStart(new URL(request.url()))
          );
          await discover.submitQuery();
          await searchHeld;

          await expect(discover.getQueryCancelButton()).toBeVisible();
          await discover.getQueryCancelButton().click();

          await expect(discover.getQueryCancelButton()).toBeHidden();
          await expect(discover.getQuerySubmitButton()).toBeVisible();
          await expect(page.testSubj.locator('discoverDataGridUpdating')).toBeHidden();
          await expect(page.testSubj.locator('discoverErrorCalloutTitle')).toBeHidden();
          await expect(page.testSubj.locator('globalToastList')).toBeHidden();
        } finally {
          releaseSearch();
        }
      }
    );

    spaceTest(
      'settles out of loading and keeps the previous rows when a query is cancelled',
      async ({ page, pageObjects }) => {
        const { discover, esqlEditor } = pageObjects;

        await esqlEditor.setQuery(INITIAL_QUERY);
        await discover.submitQueryAndWait();
        await expect(discover.getHitCountLocator()).toHaveText('10');
        // Only the rows inside the viewport are rendered, so compare content, not the count
        const previousRows = await discover.getDataGridRows();
        expect(previousRows.length).toBeGreaterThan(0);

        const releaseSearch = await holdEsqlSearchStart(page);

        try {
          await esqlEditor.setQuery(CANCELLED_QUERY);
          const searchHeld = page.waitForRequest((request) =>
            isEsqlSearchStart(new URL(request.url()))
          );
          await discover.submitQuery();
          await searchHeld;

          await expect(discover.getQueryCancelButton()).toBeVisible();
          await discover.getQueryCancelButton().click();

          await expect(discover.getQueryCancelButton()).toBeHidden();
          await expect(discover.getQuerySubmitButton()).toBeVisible();
          await expect(page.testSubj.locator('discoverDataGridUpdating')).toBeHidden();
          await expect(page.testSubj.locator('discoverErrorCalloutTitle')).toBeHidden();
          await expect(page.testSubj.locator('globalToastList')).toBeHidden();
          // The cancelled query is limit 5, so a count of 10 means the previous results are kept
          await expect(discover.getHitCountLocator()).toHaveText('10');
          expect(await discover.getDataGridRows()).toEqual(previousRows);
        } finally {
          releaseSearch();
        }
      }
    );

    spaceTest('runs a new query normally after a cancellation', async ({ page, pageObjects }) => {
      const { discover, esqlEditor } = pageObjects;
      const releaseSearch = await holdEsqlSearchStart(page);

      try {
        await esqlEditor.setQuery(INITIAL_QUERY);
        const searchHeld = page.waitForRequest((request) =>
          isEsqlSearchStart(new URL(request.url()))
        );
        await discover.submitQuery();
        await searchHeld;
        await discover.getQueryCancelButton().click();
        await expect(discover.getQuerySubmitButton()).toBeVisible();
      } finally {
        releaseSearch();
      }
      // Stop holding requests so the follow-up query reaches Elasticsearch
      await page.unroute(isEsqlSearchStart);

      await esqlEditor.setQuery(CANCELLED_QUERY);
      await discover.submitQueryAndWait();

      await expect(discover.getQuerySubmitButton()).toBeVisible();
      await expect(page.testSubj.locator('discoverDataGridUpdating')).toBeHidden();
      await expect(discover.getHitCountLocator()).toHaveText('5');
    });
  }
);
