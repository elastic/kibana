/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';

/**
 * Click the histogram breakdown selector and pick `field` (or `"No breakdown"`).
 *
 * Not part of Scout's shared `DiscoverApp` page object yet; kept here so any
 * Discover spec can reuse it. Promote once a second stable consumer appears.
 */
export const chooseBreakdownField = async (page: ScoutPage, field: string) => {
  await page.testSubj.click('unifiedHistogramBreakdownSelectorButton');
  await page.testSubj.waitForSelector('unifiedHistogramBreakdownSelectorSelectable', {
    state: 'visible',
  });
  await page.testSubj.fill('unifiedHistogramBreakdownSelectorSelectorSearch', field);
  await page
    .locator(
      `[data-test-subj="unifiedHistogramBreakdownSelectorSelectable"] .euiSelectableListItem[value="${field}"]`
    )
    .click();
  await page.testSubj.waitForSelector('unifiedHistogramBreakdownSelectorSelectable', {
    state: 'hidden',
  });
};

/**
 * Pick a histogram chart interval (e.g. `"Day"`). See note on `chooseBreakdownField`.
 */
export const setChartInterval = async (page: ScoutPage, intervalTitle: string) => {
  await page.testSubj.click('unifiedHistogramTimeIntervalSelectorButton');
  await page.testSubj.waitForSelector('unifiedHistogramTimeIntervalSelectorSelectable', {
    state: 'visible',
  });
  await page
    .locator(
      `[data-test-subj="unifiedHistogramTimeIntervalSelectorSelectable"] .euiSelectableListItem[title="${intervalTitle}"]`
    )
    .click();
  await page.testSubj.waitForSelector('unifiedHistogramTimeIntervalSelectorSelectable', {
    state: 'hidden',
  });
};

/**
 * Close the Discover document-viewer flyout and wait for it to disappear.
 */
export const closeDocViewerFlyout = async (page: ScoutPage) => {
  await page.testSubj.click('euiFlyoutCloseButton');
  await page.testSubj.waitForSelector('kbnDocViewer', { state: 'hidden' });
};

/**
 * Hover the given data-grid cell and click its "expand" action, opening the
 * cell-value popover (which embeds a Monaco editor with the row JSON).
 *
 * @param rowIndex - 0-based visible row index.
 * @param columnId - EUI data-grid column id (e.g. `_source`, `@timestamp`).
 */
export const expandGridCell = async (
  page: ScoutPage,
  { rowIndex, columnId }: { rowIndex: number; columnId: string }
) => {
  const cell = page.locator(
    `[data-grid-visible-row-index="${rowIndex}"] [data-gridcell-column-id="${columnId}"]`
  );
  await cell.hover();
  await cell.locator('[data-test-subj="euiDataGridCellExpandButton"]').click();
  await page.testSubj.waitForSelector('euiDataGridExpansionPopover', { state: 'visible' });
};

/**
 * Inside an open document-viewer flyout, toggle the grid column for `fieldName`
 * from the field-table tab. Calling this twice on the same field toggles it off.
 *
 * EUI's DataGrid renders `cellAction` buttons in several places at once: inline
 * when the cell is focused AND inside the cell's expansion popover. Multiple
 * copies share the same data-test-subj, so we scope to the one inside the
 * focused row's `euiDataGridRowCell__actionsWrapper` to ensure the click hits
 * the wired-up handler.
 */
export const toggleColumnInDocViewer = async (page: ScoutPage, fieldName: string) => {
  const nameElement = page.testSubj.locator(`tableDocViewRow-${fieldName}-name`);
  await nameElement.scrollIntoViewIfNeeded();
  await nameElement.hover();

  const toggle = page.locator(`[data-test-subj="toggleColumnButton-${fieldName}"]:visible`);
  await toggle.waitFor({ state: 'visible' });
  await toggle.click();
};
