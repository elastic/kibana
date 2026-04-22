/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover data-grid cell-expand popover + row-toggle flyout behaviours.
 */

import type { ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper, spaceTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  closeDocViewerFlyout,
  expandGridCell,
  testData,
  toggleColumnInDocViewer,
} from '../../fixtures/common';

const EXPECTED_FIRST_ROW_TIMESTAMP = 'Sep 22, 2015 @ 23:50:13.253';
const EXPECTED_FIRST_ROW_ID = 'AU_x3_g4GFA8no6QjkYX';

const firstRowTimestampCell = (page: ScoutPage) =>
  page.locator('[data-grid-visible-row-index="0"] [data-gridcell-column-id="@timestamp"]');

/**
 * Read the JSON currently rendered in the Monaco source editor (cell popover or
 * flyout source tab). Retries until the editor is mounted AND a non-empty model
 * value is present — `KibanaCodeEditorWrapper` returns `''` as soon as
 * `MonacoEnvironment` exists, even if the specific editor hasn't attached its
 * model yet, so a wrapping `expect.toPass` is needed.
 */
const readMonacoJson = async (
  page: ScoutPage
): Promise<{ _id: string } & Record<string, unknown>> => {
  const codeEditor = new KibanaCodeEditorWrapper(page);
  let parsed: { _id: string } & Record<string, unknown> = { _id: '' };
  await expect(async () => {
    const raw = await codeEditor.getCodeEditorValue();
    if (!raw) {
      throw new Error('Monaco editor has not rendered a value yet');
    }
    parsed = JSON.parse(raw);
  }).toPass({ timeout: 15_000 });
  return parsed;
};

spaceTest.describe('Discover data grid - doc viewer', { tag: testData.DISCOVER_CORE_TAGS }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
    await scoutSpace.uiSettings.set({ 'discover:rowHeightOption': 0 });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    // Privileged user is needed to save the search used by the embeddable test.
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto();
    await pageObjects.discover.waitUntilSearchingHasFinished();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset(
      'defaultIndex',
      'timepicker:timeDefaults',
      'discover:rowHeightOption'
    );
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('expands cell content via the cell-expand button', async ({ page, pageObjects }) => {
    // Sanity-check we're on the expected document so the hard-coded _id below
    // is stable
    await expect(firstRowTimestampCell(page)).toContainText(EXPECTED_FIRST_ROW_TIMESTAMP);

    await expandGridCell(page, { rowIndex: 0, columnId: '_source' });
    const popoverDoc = await readMonacoJson(page);
    expect(popoverDoc._id).toBe(EXPECTED_FIRST_ROW_ID);

    // Open the full flyout on the source tab and confirm it shows the same doc.
    await pageObjects.discover.openDocumentDetails({ rowIndex: 0 });
    await page.locator('#kbn_doc_viewer_tab_doc_view_source').click();
    const flyoutDoc = await readMonacoJson(page);
    expect(flyoutDoc._id).toBe(popoverDoc._id);

    await closeDocViewerFlyout(page);
  });

  spaceTest(
    'expands cell content via the cell-expand button on a dashboard embeddable',
    async ({ page, pageObjects }) => {
      await pageObjects.discover.saveSearch('expand-cell-search');

      await pageObjects.dashboard.openNewDashboard();
      await pageObjects.dashboard.addSavedSearch('expand-cell-search');
      await pageObjects.discover.waitUntilSearchingHasFinished();

      await expect(firstRowTimestampCell(page)).toContainText(EXPECTED_FIRST_ROW_TIMESTAMP);

      await expandGridCell(page, { rowIndex: 0, columnId: '_source' });
      const popoverDoc = await readMonacoJson(page);
      expect(popoverDoc._id).toBe(EXPECTED_FIRST_ROW_ID);

      await pageObjects.discover.openDocumentDetails({ rowIndex: 0 });
      await page.locator('#kbn_doc_viewer_tab_doc_view_source').click();
      const flyoutDoc = await readMonacoJson(page);
      expect(flyoutDoc._id).toBe(popoverDoc._id);

      await closeDocViewerFlyout(page);
    }
  );

  spaceTest('expands a document row via the row toggle', async ({ page, pageObjects }) => {
    await pageObjects.discover.openDocumentDetails({ rowIndex: 0 });
    await expect(page.testSubj.locator('docViewerRowDetailsTitle')).toBeVisible();
    await closeDocViewerFlyout(page);
  });

  spaceTest('shows the detail panel row actions', async ({ page, pageObjects }) => {
    await pageObjects.discover.openDocumentDetails({ rowIndex: 0 });

    const rowActions = page.testSubj
      .locator('docViewerFlyout')
      .locator('[data-test-subj*="docTableRowAction"]');
    await expect(rowActions).toHaveCount(2);

    await closeDocViewerFlyout(page);
  });

  spaceTest(
    'paginates docs in the flyout when clicking a different row in the grid',
    async ({ page, pageObjects }) => {
      await pageObjects.discover.openDocumentDetails({ rowIndex: 0 });
      await expect(page.testSubj.locator('docViewerFlyoutNavigationPage-0')).toBeVisible();

      await pageObjects.discover.openDocumentDetails({ rowIndex: 1 });
      await expect(page.testSubj.locator('docViewerFlyoutNavigationPage-1')).toBeVisible();

      await closeDocViewerFlyout(page);
    }
  );

  // TODO(data-discovery): the EUI DataGrid cellAction "toggleColumnButton"
  // rendered inside the doc-viewer flyout's table tab doesn't react to
  // Playwright-dispatched clicks the same way the FTR test's WebDriver clicks
  // did — either the cellAction wrapper isn't rendered on our hover/focus, or
  // the click lands on a non-trusted-event listener that EUI ignores. The
  // matching FTR test has been removed, so this gap is tracked here until a
  // Scout-friendly interaction is identified (likely a shared helper in
  // `@kbn/scout`'s DataGrid component).
  spaceTest.skip(
    'adds and removes columns from the detail panel',
    async ({ page, pageObjects }) => {
      const fields = ['_id', '_index', 'agent'];

      await pageObjects.discover.openDocumentDetails({ rowIndex: 0 });
      // The "toggle column" action is only exposed on the field-table tab.
      await page.locator('#kbn_doc_viewer_tab_doc_view_table').click();

      for (const field of fields) {
        await toggleColumnInDocViewer(page, field);
      }
      for (const field of fields) {
        await expect(
          pageObjects.discover.getColumnHeader(field),
          `column ${field} should appear in the grid after adding it from the flyout`
        ).toBeVisible();
      }

      // Calling the same toggle again removes the column.
      for (const field of fields) {
        await toggleColumnInDocViewer(page, field);
      }
      for (const field of fields) {
        await expect(
          pageObjects.discover.getColumnHeader(field),
          `column ${field} should be removed from the grid`
        ).toBeHidden();
      }

      await closeDocViewerFlyout(page);
    }
  );
});
