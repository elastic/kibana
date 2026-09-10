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
}
