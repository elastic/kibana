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
import { DASHBOARD_KBN_ARCHIVE } from '../constants';

const FILTER_PASSED_FROM_LINKS_002 = 'This filter should only pass from links002 to links001';
const FILTER_NOT_PASSED_FROM_LINKS_001 = 'This filter should not pass from links001 to links002';

spaceTest.describe(
  'Links panel - dashboard links navigation',
  { tag: tags.deploymentAgnostic },
  () => {
    let dashboardIds: Record<string, string>;

    spaceTest.beforeAll(async ({ scoutSpace }) => {
      const imported = await scoutSpace.savedObjects.load(DASHBOARD_KBN_ARCHIVE);
      dashboardIds = Object.fromEntries(
        imported.filter(({ type }) => type === 'dashboard').map(({ title, id }) => [title, id])
      );
      await scoutSpace.uiSettings.setDefaultTime({
        from: 'Oct 22, 2018 @ 00:00:00.000',
        to: 'Dec 3, 2018 @ 00:00:00.000',
      });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('should disable link if dashboard does not exist', async ({ page, pageObjects }) => {
      await pageObjects.dashboard.openDashboardWithId(dashboardIds['links 001']);

      const brokenLink = page.testSubj.locator('dashboardLink--Error fetching dashboard--error');
      await expect(brokenLink).toBeDisabled();
    });

    spaceTest('useFilters should pass filter pills and query', async ({ page, pageObjects }) => {
      /**
       * dashboard links002 has a saved filter and query bar.
       * The link to dashboard links001 only has useFilters enabled
       * so the link should pass the filters and query to dashboard links001
       * but should not override the date range.
       */
      await pageObjects.dashboard.openDashboardWithId(dashboardIds['links 002']);
      await page.testSubj.click('dashboardLink--links 001');
      await expect(page).toHaveURL(new RegExp(`/view/${dashboardIds['links 001']}`));
      await pageObjects.dashboard.waitForRenderComplete();

      // Should pass the filters
      expect(await pageObjects.filterBar.getFilterCount()).toBe(2);
      const filterLabels = (await pageObjects.filterBar.getFiltersLabel()).join('\n');
      expect(filterLabels).toContain(FILTER_PASSED_FROM_LINKS_002);
      expect(filterLabels).toContain(FILTER_NOT_PASSED_FROM_LINKS_001);

      // Should not pass the date range
      await expect(page.testSubj.locator('dateRangePickerControlButton')).toHaveAttribute(
        'data-date-range',
        '2018-10-31T00:00:00.000Z to 2018-11-01T00:00:00.000Z'
      );
    });

    spaceTest('useTimeRange should pass date range', async ({ page, pageObjects }) => {
      /**
       * dashboard links001 has saved filters and a saved date range.
       * dashboard links002 has a different saved date range than links001.
       * The link to dashboard links002 only has useTimeRange enabled
       * so the link should override the date range on dashboard links002
       * but should not pass its filters.
       */
      await pageObjects.dashboard.openDashboardWithId(dashboardIds['links 001']);
      await page.testSubj.click('dashboardLink--links 002');
      await expect(page).toHaveURL(new RegExp(`/view/${dashboardIds['links 002']}`));
      await pageObjects.dashboard.waitForRenderComplete();

      // Should pass the date range
      await expect(page.testSubj.locator('dateRangePickerControlButton')).toHaveAttribute(
        'data-date-range',
        '2018-10-31T00:00:00.000Z to 2018-11-01T00:00:00.000Z'
      );

      // Should not pass the filters
      expect(await pageObjects.filterBar.getFilterCount()).toBe(1);
      const filterLabels = (await pageObjects.filterBar.getFiltersLabel()).join('\n');
      expect(filterLabels).toContain(FILTER_PASSED_FROM_LINKS_002);
      expect(filterLabels).not.toContain(FILTER_NOT_PASSED_FROM_LINKS_001);
    });

    spaceTest(
      'openInNewTab should create an external link',
      async ({ context, page, pageObjects }) => {
        /**
         * The link to dashboard links003 only has openInNewTab enabled.
         * Clicking the link should open a new tab.
         * Other dashboards should not pass their filters or date range
         * to dashboard links003.
         */
        await pageObjects.dashboard.openDashboardWithId(dashboardIds['links 001']);

        const [newTab] = await Promise.all([
          context.waitForEvent('page'),
          page.testSubj.click('dashboardLink--links 003'),
        ]);

        await expect(newTab).toHaveURL(new RegExp(`/view/${dashboardIds['links 003']}`));
        // Should not pass any filters
        await expect(newTab.locator('[data-test-subj~="filter"]')).toHaveCount(0);
        // Should not pass any date range: the dashboard's own saved time range is used
        await expect(newTab.getByTestId('dshDashboardViewport')).toBeVisible();
        await expect(newTab.getByTestId('dateRangePickerControlButton')).toHaveAttribute(
          'data-date-range',
          '2018-12-24T00:00:00.000Z to 2018-12-26T00:00:00.000Z'
        );
      }
    );
  }
);
