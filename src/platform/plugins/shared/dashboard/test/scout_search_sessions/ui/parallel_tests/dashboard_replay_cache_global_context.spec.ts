/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Coming back to a dashboard after another app changed the time range or the pinned filters loads
 * fresh panels instead of replaying the cached ones.
 */

import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  SESSION_IN_ANOTHER_SPACE_KBN_ARCHIVE,
} from '@kbn/data-plugin/test/scout_search_sessions/ui/fixtures';

const SEARCH_REQUESTS = { endpoint: '/internal/search/ese', method: 'POST', exactPathname: true };
const RELATIVE_TIME_DEFAULTS = JSON.stringify({ from: 'now-30y', to: 'now' });
const RELATIVE_TIME_DASHBOARD_LINK = 'dashboardListingTitleLink-A-Dashboard-in-another-space';
const PINNED_FILTER = { field: 'extension.raw', operator: 'is', value: 'jpg' } as const;

spaceTest.describe(
  'Dashboard replay cache with a changed global context',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
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
      'loads fresh panels after the time range changes in another app',
      async ({ page, pageObjects, network }) => {
        await pageObjects.dashboard.goto();
        await page.testSubj.click(RELATIVE_TIME_DASHBOARD_LINK);
        await pageObjects.dashboard.waitForRenderComplete();
        await pageObjects.collapsibleNav.clickItem('Discover');
        await pageObjects.discover.waitUntilTabIsLoaded();
        await pageObjects.datePicker.setCommonlyUsedTime('This_week');
        await pageObjects.discover.waitUntilSearchingHasFinished();

        const requestCount = await network.countMatchingRequests(SEARCH_REQUESTS, async () => {
          await pageObjects.collapsibleNav.clickItem('Dashboards');
          await pageObjects.dashboard.waitForRenderComplete();
        });

        expect(requestCount).toBeGreaterThan(0);
      }
    );

    spaceTest(
      'loads fresh panels after a pinned filter is removed in another app',
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
        await pageObjects.filterBar.removeFilter(PINNED_FILTER.field);
        await pageObjects.discover.waitUntilSearchingHasFinished();

        const requestCount = await network.countMatchingRequests(SEARCH_REQUESTS, async () => {
          await pageObjects.collapsibleNav.clickItem('Dashboards');
          await pageObjects.dashboard.waitForRenderComplete();
        });

        expect(requestCount).toBeGreaterThan(0);
      }
    );
  }
);
