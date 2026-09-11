/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataGrid, ScoutPage } from '@kbn/scout';

const CONTEXT_LOAD_TIMEOUT = 30_000;

/** Resolves once the Surrounding documents page has both of its "Load more" controls rendered. */
async function waitForSurroundingDocs(page: ScoutPage) {
  for (const testSubj of ['predecessorsLoadMoreButton', 'successorsLoadMoreButton']) {
    await page.testSubj
      .locator(testSubj)
      .waitFor({ state: 'visible', timeout: CONTEXT_LOAD_TIMEOUT });
  }
}

/**
 * Ids of the grid's data columns, in display order, with control columns excluded.
 *
 * Ids rather than header text: a column header also renders its field-type label for screen
 * readers, so the visible text of `log.level` reads as `Keywordlog.level`. The summary column keeps
 * its id `_source` while displaying as "Summary".
 */
export function getGridColumnIds(page: ScoutPage): Promise<string[]> {
  return page
    .locator('.euiDataGridHeaderCell:not(.euiDataGridHeaderCell--controlColumn)')
    .evaluateAll((cells) =>
      cells.map((cell) => cell.getAttribute('data-gridcell-column-id') ?? '')
    );
}

/**
 * Resolves with the message of the next native dialog, then dismisses it. Call this *before* the
 * click that raises the dialog: with nothing listening Playwright dismisses dialogs on its own, so
 * the message would already be gone by the time it could be read.
 */
export function captureNextDialogMessage(page: ScoutPage): Promise<string> {
  return new Promise((resolve, reject) => {
    page.once('dialog', (dialog) => {
      const message = dialog.message();
      dialog.dismiss().then(() => resolve(message), reject);
    });
  });
}

/**
 * Opens the Surrounding documents page for the first row and reloads it. The reload matters: it
 * forces the page to resolve its profile from the URL alone, instead of inheriting whatever
 * Discover had already resolved before the client-side transition.
 */
export async function openSurroundingDocs(page: ScoutPage, dataGrid: DataGrid) {
  await dataGrid.openDocumentDetails({ rowIndex: 0 });

  // Row actions are ordered as they appear in the flyout; the second one opens surrounding docs.
  const [, surroundingDocsAction] = await dataGrid.getRowActions();
  await surroundingDocsAction.click();
  await waitForSurroundingDocs(page);

  await page.reload();
  await waitForSurroundingDocs(page);

  // The "Load more" controls render while the predecessor/successor searches are still in flight,
  // so the grid keeps re-rendering past that point and rows hovered too early get detached. Gate on
  // the table itself reporting loaded before touching a cell.
  await dataGrid.waitForDocTableRendered();

  // Park the pointer so a hover left over from before the reload cannot leave a column tooltip
  // covering the first row.
  await page.mouse.move(0, 0);
}
