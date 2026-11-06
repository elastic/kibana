/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Coming back to Discover from another app replays the cached responses of its tabs while the
 * time picker selection and the pinned filters are the same.
 */

import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  DISCOVER_DEFAULT_KBN_ARCHIVE,
  DISCOVER_SEARCH_REQUESTS,
  RELATIVE_TIME_DEFAULTS,
  refetchDiscover,
  waitForDiscoverResults,
} from '../fixtures';

const PINNED_FILTER = { field: 'extension.raw', operator: 'is', value: 'jpg' } as const;

spaceTest.describe('Discover replay cache', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await scoutSpace.savedObjects.load(DISCOVER_DEFAULT_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex('logstash-*');
    await scoutSpace.uiSettings.set({ 'timepicker:timeDefaults': RELATIVE_TIME_DEFAULTS });
  });

  spaceTest.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await waitForDiscoverResults(page, pageObjects.discover);
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'replays the cached results when coming back from another app',
    async ({ page, pageObjects, network }) => {
      await pageObjects.collapsibleNav.clickItem('Dashboards');
      await expect(page.testSubj.locator('dashboardLandingPage')).toBeVisible();

      const requestCount = await network.countMatchingRequests(
        DISCOVER_SEARCH_REQUESTS,
        async () => {
          await pageObjects.collapsibleNav.clickItem('Discover');
          await waitForDiscoverResults(page, pageObjects.discover);
        }
      );

      expect(requestCount).toBe(0);
    }
  );

  spaceTest(
    'replays the cached results when the pinned filters are unchanged',
    async ({ page, pageObjects, network }) => {
      const discoverContext = { page, network, discover: pageObjects.discover };
      await refetchDiscover(discoverContext, () => pageObjects.filterBar.addFilter(PINNED_FILTER));
      await refetchDiscover(discoverContext, () =>
        pageObjects.filterBar.toggleFilterPinned(PINNED_FILTER.field)
      );
      await pageObjects.collapsibleNav.clickItem('Dashboards');
      await expect(page.testSubj.locator('dashboardLandingPage')).toBeVisible();

      const requestCount = await network.countMatchingRequests(
        DISCOVER_SEARCH_REQUESTS,
        async () => {
          await pageObjects.collapsibleNav.clickItem('Discover');
          await waitForDiscoverResults(page, pageObjects.discover);
        }
      );

      expect(requestCount).toBe(0);
    }
  );

  spaceTest(
    'loads fresh results on refresh after a replay',
    async ({ page, pageObjects, network }) => {
      await pageObjects.collapsibleNav.clickItem('Dashboards');
      await expect(page.testSubj.locator('dashboardLandingPage')).toBeVisible();
      await pageObjects.collapsibleNav.clickItem('Discover');
      await waitForDiscoverResults(page, pageObjects.discover);

      const requestCount = await refetchDiscover(
        { page, network, discover: pageObjects.discover },
        () => pageObjects.discover.submitQuery()
      );

      expect(requestCount).toBeGreaterThanOrEqual(2);
    }
  );

  spaceTest(
    'replays every tab that was loaded before leaving',
    async ({ page, pageObjects, network }) => {
      await refetchDiscover({ page, network, discover: pageObjects.discover }, () =>
        pageObjects.discover.createNewTabAndSearch()
      );
      await pageObjects.unifiedTabs.selectTab(0);
      await waitForDiscoverResults(page, pageObjects.discover);
      await pageObjects.collapsibleNav.clickItem('Dashboards');
      await expect(page.testSubj.locator('dashboardLandingPage')).toBeVisible();

      const requestCount = await network.countMatchingRequests(
        DISCOVER_SEARCH_REQUESTS,
        async () => {
          await pageObjects.collapsibleNav.clickItem('Discover');
          await waitForDiscoverResults(page, pageObjects.discover);
          await pageObjects.unifiedTabs.selectTab(1);
          await waitForDiscoverResults(page, pageObjects.discover);
        }
      );

      expect(requestCount).toBe(0);
    }
  );
});
