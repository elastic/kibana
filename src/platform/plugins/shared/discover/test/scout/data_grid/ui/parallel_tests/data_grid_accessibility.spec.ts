/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Automated a11y scans of the data grid's column menu and toolbar popovers.
 *
 * These states are not reached by any other data-grid spec — the specs that do
 * open them (`data_grid_copy_to_clipboard`, `data_grid_sample_size`) click
 * straight through to an action, leaving nothing open to scan. Grid states that
 * other specs do reach are scanned there instead: columns and full screen in
 * `data_grid.spec.ts`, flyout-added columns in `data_grid_doc_viewer.spec.ts`.
 *
 * All three render through EUI portals, so each scan targets the popover rather
 * than the grid.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

const SORT_POPOVER_TEST_SUBJ = '[data-test-subj="dataGridColumnSortingPopover"]';
const DISPLAY_POPOVER_TEST_SUBJ = '[data-test-subj="dataGridDisplaySelectorPopover"]';

const COLUMN = 'extension';

spaceTest.describe('Discover data grid - accessibility', { tag: '@local-stateful-classic' }, () => {
  // EUI truncates inline cell actions and toolbar controls at narrow widths.
  spaceTest.use({ viewport: { width: 1600, height: 1200 } });

  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
    // Popovers animate in; axe can otherwise scan a half-rendered frame.
    await discoverScoutSpace.uiSettings.set({ 'accessibility:disableAnimations': true });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.dataGrid.waitForLoad();
    await pageObjects.dataGrid.waitForDocTableRendered();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.uiSettings.unset('accessibility:disableAnimations');
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'has no automated a11y violations in the column actions menu',
    async ({ page, pageObjects }) => {
      const { unifiedFieldList, dataGrid } = pageObjects;

      await unifiedFieldList.waitUntilSidebarHasLoaded();
      await unifiedFieldList.clickFieldListItemAdd(COLUMN);
      await dataGrid.openColumnMenuByField(COLUMN);

      const { violations } = await page.checkA11y({
        include: [`[data-test-subj="dataGridHeaderCellActionGroup-${COLUMN}"]`],
      });
      expect(violations).toStrictEqual([]);
    }
  );

  spaceTest(
    'has no automated a11y violations in the sort and display popovers',
    async ({ page, pageObjects }) => {
      const { dataGrid } = pageObjects;

      await spaceTest.step('sort popover', async () => {
        await dataGrid.openSortPopover();

        const { violations } = await page.checkA11y({ include: [SORT_POPOVER_TEST_SUBJ] });
        expect(violations).toStrictEqual([]);
      });

      await spaceTest.step('display settings popover', async () => {
        // Close the sort popover so its trigger is not left expanded.
        await page.keyboard.press('Escape');
        await dataGrid.openGridDisplaySettings();
        // The helper gates on the trigger's `aria-expanded`, not on the panel.
        await expect(page.locator(DISPLAY_POPOVER_TEST_SUBJ)).toBeVisible();

        const { violations } = await page.checkA11y({ include: [DISPLAY_POPOVER_TEST_SUBJ] });
        expect(violations).toStrictEqual([]);
      });
    }
  );
});
