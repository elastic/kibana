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

      const loggedRowCount = Number(await grid.getAttribute('aria-rowcount'));
      const mountedRowCount = await grid.getByRole('row').count();

      expect(mountedRowCount).toBeGreaterThan(1);
      expect(mountedRowCount).toBeLessThan(loggedRowCount);
    });

    spaceTest('moves focus to the off-screen last row with Ctrl+End', async ({ page }) => {
      const grid = page.testSubj.locator(FIELDS_GRID_TEST_SUBJ);
      await grid.getByRole('gridcell', { name: /@timestamp/ }).click();

      await page.keyboard.press('Control+End');

      // Rows are sorted by field name, so `xss` is last and initially not mounted.
      const lastRow = grid.getByRole('row').filter({ hasText: 'xss' });
      await expect(lastRow.locator('[aria-colindex="2"]')).toBeFocused();
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
