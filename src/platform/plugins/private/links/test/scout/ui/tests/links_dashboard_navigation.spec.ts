/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import {
  DASHBOARD_ES_ARCHIVE,
  DASHBOARD_IDS,
  DASHBOARD_KBN_ARCHIVE,
  DEFAULT_DATA_VIEW_ID,
} from '../constants';

const FILTER_PASSED_FROM_LINKS_002 = 'This filter should only pass from links002 to links001';
const FILTER_NOT_PASSED_FROM_LINKS_001 = 'This filter should not pass from links001 to links002';

test.describe(
  'Links panel - dashboard links navigation',
  { tag: ['@local-stateful-classic'] },
  () => {
    test.beforeAll(async ({ esArchiver, kbnClient, uiSettings }) => {
      // The dashboards' data view needs an existing time-based index for the time picker to be enabled.
      await esArchiver.loadIfNeeded(DASHBOARD_ES_ARCHIVE);
      await kbnClient.importExport.load(DASHBOARD_KBN_ARCHIVE);
      await uiSettings.set({ defaultIndex: DEFAULT_DATA_VIEW_ID });
      await uiSettings.setDefaultTime({
        from: 'Oct 22, 2018 @ 00:00:00.000',
        to: 'Dec 3, 2018 @ 00:00:00.000',
      });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test.afterAll(async ({ kbnClient, uiSettings }) => {
      await uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await kbnClient.savedObjects.cleanStandardList();
    });

    test('should disable link if dashboard does not exist', async ({ page, pageObjects }) => {
      await pageObjects.dashboard.openDashboardWithId(DASHBOARD_IDS.LINKS_001);

      const brokenLink = page.testSubj.locator('dashboardLink--Error fetching dashboard--error');
      await expect(brokenLink).toBeDisabled();
    });

    test('useFilters should pass filter pills and query', async ({ page, pageObjects }) => {
      /**
       * dashboard links002 has a saved filter and query bar.
       * The link to dashboard links001 only has useFilters enabled
       * so the link should pass the filters and query to dashboard links001
       * but should not override the date range.
       */
      await pageObjects.dashboard.openDashboardWithId(DASHBOARD_IDS.LINKS_002);
      await page.testSubj.click('dashboardLink--links 001');
      await expect(page).toHaveURL(new RegExp(`/view/${DASHBOARD_IDS.LINKS_001}`));
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

    test('useTimeRange should pass date range', async ({ page, pageObjects }) => {
      /**
       * dashboard links001 has saved filters and a saved date range.
       * dashboard links002 has a different saved date range than links001.
       * The link to dashboard links002 only has useTimeRange enabled
       * so the link should override the date range on dashboard links002
       * but should not pass its filters.
       */
      await pageObjects.dashboard.openDashboardWithId(DASHBOARD_IDS.LINKS_001);
      await page.testSubj.click('dashboardLink--links 002');
      await expect(page).toHaveURL(new RegExp(`/view/${DASHBOARD_IDS.LINKS_002}`));
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

    test('openInNewTab should create an external link', async ({ context, page, pageObjects }) => {
      /**
       * The link to dashboard links003 only has openInNewTab enabled.
       * Clicking the link should open a new tab.
       * Other dashboards should not pass their filters or date range
       * to dashboard links003.
       */
      await pageObjects.dashboard.openDashboardWithId(DASHBOARD_IDS.LINKS_001);

      const [newTab] = await Promise.all([
        context.waitForEvent('page'),
        page.testSubj.click('dashboardLink--links 003'),
      ]);

      await expect(newTab).toHaveURL(new RegExp(`/view/${DASHBOARD_IDS.LINKS_003}`));
      // Should not pass any filters
      await expect(newTab.locator('[data-test-subj~="filter"]')).toHaveCount(0);
      // Should not pass any date range: the dashboard's own saved time range is used
      await expect(newTab.getByTestId('dshDashboardViewport')).toBeVisible();
      await expect(newTab.getByTestId('dateRangePickerControlButton')).toHaveAttribute(
        'data-date-range',
        '2018-12-24T00:00:00.000Z to 2018-12-26T00:00:00.000Z'
      );
    });
  }
);
