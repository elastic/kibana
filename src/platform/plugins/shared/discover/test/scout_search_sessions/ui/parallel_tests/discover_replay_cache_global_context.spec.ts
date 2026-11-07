/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Coming back to Discover after another app changed the time range or the pinned filters loads
 * fresh results instead of replaying the cached ones.
 */

import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  DISCOVER_DEFAULT_KBN_ARCHIVE,
  DISCOVER_SEARCH_REQUESTS,
  LOGSTASH_TIME_RANGE,
  RELATIVE_TIME_DEFAULTS,
  refetchDiscover,
  waitForDiscoverResults,
} from '../fixtures';

const STORED_TIME_DASHBOARD = 'Replay stored time';
const STORED_TIME_DASHBOARD_LINK = 'dashboardListingTitleLink-Replay-stored-time';
const UNSTORED_TIME_DASHBOARD = 'Replay unstored time';
const UNSTORED_TIME_DASHBOARD_LINK = 'dashboardListingTitleLink-Replay-unstored-time';
const PINNED_FILTER = { field: 'extension.raw', operator: 'is', value: 'jpg' } as const;

spaceTest.describe(
  'Discover replay cache with a changed global context',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      await scoutSpace.savedObjects.load(DISCOVER_DEFAULT_KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex('logstash-*');
      await scoutSpace.uiSettings.set({ 'timepicker:timeDefaults': RELATIVE_TIME_DEFAULTS });
      await apiServices.dashboard.create(
        {
          title: STORED_TIME_DASHBOARD,
          time_range: { ...LOGSTASH_TIME_RANGE, mode: 'absolute' },
        },
        scoutSpace.id
      );
      await apiServices.dashboard.create({ title: UNSTORED_TIME_DASHBOARD }, scoutSpace.id);
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
      'loads fresh results after opening a dashboard with a stored time range',
      async ({ page, pageObjects, network }) => {
        await pageObjects.collapsibleNav.clickItem('Dashboards');
        await page.testSubj.click(STORED_TIME_DASHBOARD_LINK);
        await expect
          .poll(() => pageObjects.datePicker.getTimeRangeText(), { timeout: 30_000 })
          .toContain('2015');

        const requestCount = await network.countMatchingRequests(
          DISCOVER_SEARCH_REQUESTS,
          async () => {
            await pageObjects.collapsibleNav.clickItem('Discover');
            await waitForDiscoverResults(page, pageObjects.discover);
          }
        );

        expect(requestCount).toBeGreaterThanOrEqual(2);
      }
    );

    spaceTest(
      'loads fresh results after a dashboard removes a pinned filter',
      async ({ page, pageObjects, network }) => {
        const discoverContext = { page, network, discover: pageObjects.discover };
        await refetchDiscover(discoverContext, () =>
          pageObjects.filterBar.addFilter(PINNED_FILTER)
        );
        await refetchDiscover(discoverContext, () =>
          pageObjects.filterBar.toggleFilterPinned(PINNED_FILTER.field)
        );
        await pageObjects.collapsibleNav.clickItem('Dashboards');
        await page.testSubj.click(UNSTORED_TIME_DASHBOARD_LINK);
        await expect
          .poll(
            () => pageObjects.filterBar.hasFilter({ field: PINNED_FILTER.field, pinned: true }),
            {
              timeout: 30_000,
            }
          )
          .toBe(true);
        await pageObjects.filterBar.removeFilter(PINNED_FILTER.field);
        await expect.poll(() => pageObjects.filterBar.getFilterCount()).toBe(0);

        const requestCount = await network.countMatchingRequests(
          DISCOVER_SEARCH_REQUESTS,
          async () => {
            await pageObjects.collapsibleNav.clickItem('Discover');
            await waitForDiscoverResults(page, pageObjects.discover);
          }
        );

        expect(requestCount).toBeGreaterThanOrEqual(2);
      }
    );
  }
);
