/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Baseline real-browser coverage of the doc-viewer fields table rendered by
 * `@kbn/discover-data-grid`, selected through the internal
 * `discover.kbnDataGridEnabled` feature flag.
 *
 * The new renderer is intentionally incomplete (no cell actions or details,
 * resizing, density, pin control, or scroll restoration yet), so this spec only
 * covers what the foundation owns: grid semantics, bounded virtualization,
 * keyboard navigation to off-screen rows and accessibility.
 *
 * These tests will be moved to the parallel datagrid tests when the feature flag is removed.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

const KBN_DATA_GRID_FLAG = 'discover.kbnDataGridEnabled';
const FIELDS_GRID_TEST_SUBJ = 'UnifiedDocViewerTableGrid';
const DOC_VIEWER_TEST_SUBJ = 'kbnDocViewer';
// The grid's default number of rows rendered beyond each edge of its viewport.
const ROW_OVERSCAN = 5;

spaceTest.describe(
  'Discover doc viewer - fields table rendered by the Kibana data grid foundation',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ apiServices, discoverScoutSpace }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': { [KBN_DATA_GRID_FLAG]: true },
      });
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.dataGrid.waitForLoad();
      await pageObjects.dataGrid.waitForDocTableRendered();
      await pageObjects.docViewer.openAndWaitForFlyout({ rowIndex: 0 });
    });

    spaceTest.afterAll(async ({ apiServices, discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
      await apiServices.core.settings({
        'feature_flags.overrides': { [KBN_DATA_GRID_FLAG]: null },
      });
    });

    spaceTest('mounts only the rows near the viewport of a long document', async ({ page }) => {
      const grid = page.testSubj.locator(FIELDS_GRID_TEST_SUBJ);
      await expect(grid).toBeVisible();

      const logicalRowCount = Number(await grid.getAttribute('aria-rowcount'));
      const rows = grid.getByRole('row');
      const mountedRowCount = await rows.count();
      const viewportHeight = await grid.evaluate((element) => element.clientHeight);
      const rowHeights = await rows.evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().height)
      );
      // Even if every row were as short as the shortest mounted one, the grid may only mount the rows
      // that fit its viewport, the overscan on each side, and one retained active row.
      const maxMountedRowCount =
        Math.ceil(viewportHeight / Math.min(...rowHeights)) + 2 * ROW_OVERSCAN + 1;

      expect(mountedRowCount).toBeGreaterThan(1);
      expect(mountedRowCount).toBeLessThan(logicalRowCount);
      expect(mountedRowCount).toBeLessThanOrEqual(maxMountedRowCount);
    });

    spaceTest('moves focus to the off-screen last row with Ctrl+End', async ({ page }) => {
      const grid = page.testSubj.locator(FIELDS_GRID_TEST_SUBJ);
      await grid.getByRole('gridcell', { name: /@timestamp/ }).click();

      await page.keyboard.press('Control+End');

      // Rows are sorted by field name, so `xss` is last and initially not mounted. Ctrl+End moves
      // to the last cell of the grid, the cell that holds the value of `xss`.
      const lastCell = grid
        .getByRole('gridcell')
        .filter({ has: page.testSubj.locator('tableDocViewRow-xss-value') });
      await expect(lastCell).toBeFocused();
    });

    spaceTest('has no accessibility violations in the doc viewer', async ({ page }) => {
      // The doc viewer also contains the markup the grid renders next to its grid element, such as
      // its focus guards and live region.
      const { violations } = await page.checkA11y({
        include: [`[data-test-subj="${DOC_VIEWER_TEST_SUBJ}"]`],
      });

      expect(violations).toStrictEqual([]);
    });
  }
);
