/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import kbnRison from '@kbn/rison';
import type { DataGrid, ScoutPage } from '@kbn/scout';
import type { DocViewer } from '@kbn/unified-doc-viewer/test/scout/ui/fixtures/page_objects';

/**
 * The predecessor and successor searches on the Surrounding documents page are issued separately
 * from the page render and are slower than a plain Discover fetch, so their controls can take
 * noticeably longer than the default assertion timeout to appear.
 */
const CONTEXT_LOAD_TIMEOUT = 30_000;

const GRID_DISPLAY_SELECTOR_BUTTON = 'dataGridDisplaySelectorButton';
const ROW_HEIGHT_LINE_COUNT = 'unifiedDataTableRowHeightSettings_lineCountNumber';
const PROFILE_STATE_DOC_VIEW_TAB = 'doc_view_profile_state_example';

/**
 * Id of the locator the Surrounding documents flyout action navigates through, as registered in
 * `public/application/context/services/locator.ts`. Inlined rather than imported: it is not part of
 * the plugin's public API, and a test has no business reaching into `public/` internals.
 */
const DISCOVER_CONTEXT_APP_LOCATOR = 'DISCOVER_CONTEXT_APP_LOCATOR';

export interface RowHeightSetting {
  value: 'Auto' | 'Custom';
  /** Lines configured for a `Custom` height; `null` while the height is `Auto`. */
  lineCount: string | null;
}

/** The grid display popover is a toggle, so closing it means clicking the same toolbar button. */
async function closeGridDisplaySettings(page: ScoutPage) {
  await page.testSubj.click(GRID_DISPLAY_SELECTOR_BUTTON);
  await page.testSubj.locator('densityButtonGroup').waitFor({ state: 'hidden' });
}

/**
 * Reads the row height out of the grid display popover, leaving the popover closed again so it
 * cannot swallow later clicks.
 */
export async function readRowHeight(
  page: ScoutPage,
  dataGrid: DataGrid
): Promise<RowHeightSetting> {
  await dataGrid.openGridDisplaySettings();

  try {
    const value = await dataGrid.getCurrentRowHeight();
    const lineCount =
      value === 'Custom' ? await page.testSubj.locator(ROW_HEIGHT_LINE_COUNT).inputValue() : null;

    return { value, lineCount };
  } finally {
    await closeGridDisplaySettings(page);
  }
}

/** Sets the row height through the grid display popover, then closes it. */
export async function setRowHeight(
  page: ScoutPage,
  dataGrid: DataGrid,
  value: RowHeightSetting['value'],
  lineCount?: number
) {
  await dataGrid.openGridDisplaySettings();

  try {
    await dataGrid.setRowHeight(value);

    if (lineCount !== undefined) {
      const input = page.testSubj.locator(ROW_HEIGHT_LINE_COUNT);
      await input.fill(String(lineCount));
      await input.blur();
    }
  } finally {
    await closeGridDisplaySettings(page);
  }
}

/**
 * Profile state that rides along in the URL, under the `_p` hash parameter. Returns `undefined`
 * when the URL carries none, which is itself meaningful: it is how "this state was never written"
 * is told apart from "it was written and then reverted".
 */
export async function getProfileUrlState(page: ScoutPage): Promise<unknown> {
  const { hash } = new URL(page.url());
  const queryIndex = hash.indexOf('?');

  if (queryIndex === -1) {
    return undefined;
  }

  const profileUrlState = new URLSearchParams(hash.slice(queryIndex + 1)).get('_p');

  return profileUrlState ? kbnRison.decode(profileUrlState) : undefined;
}

/** Raw `discover.tabs` localStorage entry, where persisted per-tab profile state ends up. */
export function getStoredTabs(page: ScoutPage): Promise<string> {
  return page.evaluate(() => window.localStorage.getItem('discover.tabs') ?? '');
}

/**
 * Opens the profile state doc viewer tab.
 *
 * Whether the flyout is already open genuinely varies by call site — it survives a Discover tab
 * switch but not a page reload or a tab restore — and the branch is here rather than at the call
 * sites so the specs read as "show me the profile state" throughout.
 */
export async function openProfileStateDocView(page: ScoutPage, docViewer: DocViewer) {
  const isFlyoutOpen = await page.testSubj.locator('docViewerFlyout').isVisible();

  if (!isFlyoutOpen) {
    await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
  }

  await docViewer.openTab(PROFILE_STATE_DOC_VIEW_TAB);
}

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

  // Both flyout actions share the `docTableRowAction` subject and render as icon-only links here,
  // so neither a test subject nor visible text can tell them apart. Their `href` can: it is a
  // redirect of the form `/app/r?l=<locator id>`.
  await page.testSubj
    .locator('docViewerFlyout')
    .locator(`[data-test-subj~="docTableRowAction"][href*="${DISCOVER_CONTEXT_APP_LOCATOR}"]`)
    .click();
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
