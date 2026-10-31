/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Coming back to a dashboard from another app replays its cached panels while the time picker
 * selection and the pinned filters are the same.
 */

import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  DASHBOARD_ASYNC_SEARCH_KBN_ARCHIVE,
  SESSION_IN_ANOTHER_SPACE_KBN_ARCHIVE,
} from '@kbn/data-plugin/test/scout_search_sessions/ui/fixtures';

const SEARCH_REQUESTS = { endpoint: '/internal/search/ese', method: 'POST', exactPathname: true };
/** Relative on purpose: a replay check that resolved "now" would miss on every return. */
const RELATIVE_TIME_DEFAULTS = JSON.stringify({ from: 'now-30y', to: 'now' });
const RELATIVE_TIME_DASHBOARD_LINK = 'dashboardListingTitleLink-A-Dashboard-in-another-space';
const STORED_TIME_DASHBOARD_LINK = 'dashboardListingTitleLink-Not-Delayed';
const PINNED_FILTER = { field: 'extension.raw', operator: 'is', value: 'jpg' } as const;

spaceTest.describe('Dashboard replay cache', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await scoutSpace.savedObjects.load(DASHBOARD_ASYNC_SEARCH_KBN_ARCHIVE);
    await scoutSpace.savedObjects.load(SESSION_IN_ANOTHER_SPACE_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex('logstash-*');
    await scoutSpace.uiSettings.set({ 'timepicker:timeDefaults': RELATIVE_TIME_DEFAULTS });
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'replays the cached panels when coming back from another app',
    async ({ page, pageObjects, network }) => {
      await pageObjects.dashboard.goto();
      await page.testSubj.click(RELATIVE_TIME_DASHBOARD_LINK);
      await pageObjects.dashboard.waitForRenderComplete();
      await pageObjects.collapsibleNav.clickItem('Discover');
      await pageObjects.discover.waitUntilTabIsLoaded();

      const requestCount = await network.countMatchingRequests(SEARCH_REQUESTS, async () => {
        await pageObjects.collapsibleNav.clickItem('Dashboards');
        await pageObjects.dashboard.waitForRenderComplete();
      });

      expect(requestCount).toBe(0);
    }
  );

  spaceTest(
    'replays the cached panels of a dashboard with a stored time range',
    async ({ page, pageObjects, network }) => {
      await pageObjects.dashboard.goto();
      await page.testSubj.click(STORED_TIME_DASHBOARD_LINK);
      await pageObjects.dashboard.waitForRenderComplete();
      await pageObjects.collapsibleNav.clickItem('Discover');
      await pageObjects.discover.waitUntilTabIsLoaded();

      const requestCount = await network.countMatchingRequests(SEARCH_REQUESTS, async () => {
        await pageObjects.collapsibleNav.clickItem('Dashboards');
        await pageObjects.dashboard.waitForRenderComplete();
      });

      expect(requestCount).toBe(0);
    }
  );

  spaceTest(
    'replays the cached panels when the pinned filters are unchanged',
    async ({ page, pageObjects, network }) => {
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.waitUntilTabIsLoaded();
      await pageObjects.filterBar.addFilter(PINNED_FILTER);
      await pageObjects.filterBar.toggleFilterPinned(PINNED_FILTER.field);
      await pageObjects.collapsibleNav.clickItem('Dashboards');
      await page.testSubj.click(RELATIVE_TIME_DASHBOARD_LINK);
      await pageObjects.dashboard.waitForRenderComplete();
      await pageObjects.collapsibleNav.clickItem('Discover');
      await pageObjects.discover.waitUntilTabIsLoaded();

      const requestCount = await network.countMatchingRequests(SEARCH_REQUESTS, async () => {
        await pageObjects.collapsibleNav.clickItem('Dashboards');
        await pageObjects.dashboard.waitForRenderComplete();
      });

      expect(requestCount).toBe(0);
    }
  );

  spaceTest(
    'loads fresh panels on refresh after a replay',
    async ({ page, pageObjects, network }) => {
      await pageObjects.dashboard.goto();
      await page.testSubj.click(RELATIVE_TIME_DASHBOARD_LINK);
      await pageObjects.dashboard.waitForRenderComplete();
      await pageObjects.collapsibleNav.clickItem('Discover');
      await pageObjects.discover.waitUntilTabIsLoaded();
      await pageObjects.collapsibleNav.clickItem('Dashboards');
      await pageObjects.dashboard.waitForRenderComplete();

      const requestCount = await network.trackMatchingRequests(
        SEARCH_REQUESTS,
        async (getCount) => {
          await pageObjects.dashboard.refresh();
          await expect.poll(getCount, { timeout: 30_000 }).toBeGreaterThan(0);
          await pageObjects.dashboard.waitForRenderComplete();
        }
      );

      expect(requestCount).toBeGreaterThan(0);
    }
  );
});
