/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Automated a11y scans of the Discover data grid.
 *
 * The toolbar popovers and the column menu render through EUI portals, so each
 * of those scans targets the popover rather than the grid.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

const GRID_TEST_SUBJ = '[data-test-subj="discoverDocTable"]';
const SORT_POPOVER_TEST_SUBJ = '[data-test-subj="dataGridColumnSortingPopover"]';
const DISPLAY_POPOVER_TEST_SUBJ = '[data-test-subj="dataGridDisplaySelectorPopover"]';

const SIDEBAR_COLUMNS = ['extension', 'geo.src'];

/** Fields the flyout's "toggle column" action exposes for the first row. */
const FLYOUT_COLUMNS = ['agent', '_index'];

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
    'has no automated a11y violations with columns added from the sidebar',
    async ({ page, pageObjects }) => {
      const { unifiedFieldList, dataGrid } = pageObjects;

      await unifiedFieldList.waitUntilSidebarHasLoaded();
      for (const column of SIDEBAR_COLUMNS) {
        await unifiedFieldList.clickFieldListItemAdd(column);
      }
      for (const column of SIDEBAR_COLUMNS) {
        await expect(dataGrid.getColumnHeader(column)).toBeVisible();
      }

      const { violations } = await page.checkA11y({ include: [GRID_TEST_SUBJ] });
      expect(violations).toStrictEqual([]);
    }
  );

  spaceTest(
    'has no automated a11y violations with columns added from the doc viewer flyout',
    async ({ page, pageObjects }) => {
      const { docViewer, dataGrid, toasts } = pageObjects;

      await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
      for (const column of FLYOUT_COLUMNS) {
        await docViewer.toggleColumn(column);
      }
      await docViewer.close();
      // Adding columns raises toasts that overlay the grid.
      await toasts.dismissAll();

      // Assert every column, not just the last: the toggle is idempotent per
      // click, so a column dropped along the way would otherwise go unnoticed.
      for (const column of FLYOUT_COLUMNS) {
        await expect(dataGrid.getColumnHeader(column)).toBeVisible();
      }

      const { violations } = await page.checkA11y({ include: [GRID_TEST_SUBJ] });
      expect(violations).toStrictEqual([]);
    }
  );

  spaceTest(
    'has no automated a11y violations in the column actions menu',
    async ({ page, pageObjects }) => {
      const { unifiedFieldList, dataGrid } = pageObjects;
      const [column] = SIDEBAR_COLUMNS;

      await unifiedFieldList.waitUntilSidebarHasLoaded();
      await unifiedFieldList.clickFieldListItemAdd(column);
      await dataGrid.openColumnMenuByField(column);

      const { violations } = await page.checkA11y({
        include: [`[data-test-subj="dataGridHeaderCellActionGroup-${column}"]`],
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

  spaceTest(
    'has no automated a11y violations in full screen mode',
    async ({ page, pageObjects }) => {
      const { dataGrid } = pageObjects;

      await dataGrid.toggleFullScreen();

      const { violations } = await page.checkA11y({ include: [GRID_TEST_SUBJ] });
      expect(violations).toStrictEqual([]);

      await dataGrid.toggleFullScreen();
    }
  );
});
