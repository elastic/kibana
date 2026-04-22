/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Exercises the Discover document grid: rows render, time-range changes refresh
 * the grid, document rows can be expanded to a flyout, and columns can be
 * added/removed via the sidebar field list.
 *
 * Migrated from the FTR suite at
 * src/platform/test/functional/apps/discover/group2_data_grid1/_data_grid_doc_table.ts.
 * The "expand cell content" and "expand on embeddable" FTR tests are intentionally
 * not migrated in this pass — they rely on Monaco editor JSON parsing and a
 * dashboard flow that will be covered separately.
 */

import { spaceTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData, waitForDiscoverToSettle } from '../../fixtures/common';

const NARROWED_TIME_RANGE = {
  from: 'Sep 20, 2015 @ 23:00:00.000',
  to: 'Sep 20, 2015 @ 23:14:00.000',
};

spaceTest.describe('Discover data grid - doc table', { tag: testData.DISCOVER_CORE_TAGS }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
    // Mirror the FTR suite: force single-line rows for a deterministic layout.
    await scoutSpace.uiSettings.set({ 'discover:rowHeightOption': 0 });
  });

  spaceTest.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    // Viewer is sufficient for read-only grid interactions.
    await browserAuth.loginAsViewer();
    await pageObjects.discover.goto();
    await waitForDiscoverToSettle(page);
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset(
      'defaultIndex',
      'timepicker:timeDefaults',
      'discover:rowHeightOption'
    );
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('renders rows by default', async ({ page }) => {
    await expect(page.testSubj.locator('discoverDocTable')).toBeVisible();
    const rows = page.locator('[data-test-subj="discoverDocTable"] [data-grid-row-index]');
    expect(await rows.count()).toBeGreaterThan(0);
  });

  spaceTest('refreshes the table when the time range changes', async ({ page, pageObjects }) => {
    const rows = page.locator('[data-test-subj="discoverDocTable"] [data-grid-row-index]');
    const initialCount = await rows.count();
    expect(initialCount).toBeGreaterThan(0);

    await pageObjects.datePicker.setAbsoluteRange(NARROWED_TIME_RANGE);
    await waitForDiscoverToSettle(page);

    const finalCount = await rows.count();
    expect(finalCount).toBeLessThan(initialCount);
  });

  spaceTest(
    'expands a document row to show the doc viewer flyout',
    async ({ page, pageObjects }) => {
      await pageObjects.discover.openAndWaitForDocViewerFlyout({ rowIndex: 0 });
      await expect(page.testSubj.locator('docViewerRowDetailsTitle')).toBeVisible();
      await page.testSubj.click('euiFlyoutCloseButton');
      await expect(page.testSubj.locator('kbnDocViewer')).toBeHidden();
    }
  );

  spaceTest(
    'adds and removes columns via the sidebar field list',
    async ({ page, pageObjects }) => {
      const columns = ['phpmemory', 'ip'];

      for (const column of columns) {
        await page.testSubj.fill('fieldListFiltersFieldSearch', column);
        await page.testSubj.click(`fieldToggle-${column}`);
      }
      await waitForDiscoverToSettle(page);

      for (const column of columns) {
        await expect(
          pageObjects.discover.getColumnHeader(column),
          `column ${column} should be in the grid after adding it`
        ).toBeVisible();
      }

      for (const column of columns) {
        await page.testSubj.fill('fieldListFiltersFieldSearch', column);
        await page.testSubj.click(`fieldToggle-${column}`);
      }
      await waitForDiscoverToSettle(page);

      for (const column of columns) {
        await expect(
          pageObjects.discover.getColumnHeader(column),
          `column ${column} should be removed from the grid`
        ).toBeHidden();
      }
    }
  );
});
