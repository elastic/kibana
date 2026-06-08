/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from '@playwright/test';
import type { ScoutPage } from '..';
import { expect } from '..';

const SAMPLE_SIZE_INPUT_TEST_SUBJ = 'unifiedDataTableSampleSizeInput';
const ROWS_PER_PAGE_BUTTON_TEST_SUBJ = 'tablePaginationPopoverButton';

/**
 * Page-object wrapper around the unified data grid (Discover, Dashboard, …).
 *
 * The grid is a shared component, so this PO lives in `@kbn/scout` rather
 * than in the Discover plugin's local fixtures. Methods are kept thin and
 * mirror the corresponding FTR `dataGrid` service helpers so migrations
 * don't have to relearn names.
 */
export class DataGrid {
  constructor(private readonly page: ScoutPage) {}

  /**
   * The visible header column names of the active data grid, in display
   * order. Mirrors FTR `dataGrid.getHeaderFields()`.
   *
   * Reads textual content from `.euiDataGridHeaderCell__content` because
   * that's the only element with a stable name attached (no per-column
   * `data-test-subj`s exist for header text). Cells are rendered inside
   * elements that already carry `dataGridHeaderCell-<id>` test-subjs so the
   * fallback is bounded to known DOM.
   */
  async getHeaderFields(): Promise<string[]> {
    const cells = this.page.locator(
      '[data-test-subj^="dataGridHeaderCell-"] .euiDataGridHeaderCell__content'
    );
    const texts = await cells.allInnerTexts();
    return texts.map((t) => t.trim());
  }

  /**
   * Toggle the data-grid display selector popover (sample size, density,
   * row height, rows per page). Mirrors FTR `dataGrid.clickGridSettings()`.
   * The settings popover is a toggle: calling twice closes it again.
   */
  async clickGridSettings(): Promise<void> {
    await this.page.testSubj.click('dataGridDisplaySelectorButton');
  }

  /**
   * The current sample-size input value as a number. Caller is expected to
   * have opened the display selector first via {@link clickGridSettings}.
   */
  async getCurrentSampleSizeValue(): Promise<number> {
    // EuiRange with showInput renders TWO elements with the same test-subj
    // (a range slider and the editable number input). Combine the attribute
    // selectors on a single element so we only match the number input.
    const input = this.page.locator(
      `input[type="number"][data-test-subj="${SAMPLE_SIZE_INPUT_TEST_SUBJ}"]`
    );
    const value = await input.inputValue();
    return Number(value);
  }

  /**
   * Replace the sample-size input with `newValue`. Caller must have opened
   * the display selector first.
   */
  async changeSampleSizeValue(newValue: number): Promise<void> {
    const input = this.page.locator(
      `input[type="number"][data-test-subj="${SAMPLE_SIZE_INPUT_TEST_SUBJ}"]`
    );
    await input.fill(String(newValue));
    // Press Enter so the controlled input commits its value to React state
    // (the FTR helper relies on a blur event; fill→Enter is the closest
    // Playwright analogue and avoids racing the popover's outside-click handler).
    await input.press('Enter');
  }

  /**
   * Assert (with retry) that the grid currently shows `value` rows per page.
   * Mirrors FTR `dataGrid.checkCurrentRowsPerPageToBe(value)` — used as a
   * waiter immediately after {@link changeRowsPerPageTo}.
   */
  async checkCurrentRowsPerPageToBe(value: number): Promise<void> {
    await expect(this.page.testSubj.locator(ROWS_PER_PAGE_BUTTON_TEST_SUBJ)).toContainText(
      `Rows per page: ${value}`
    );
  }

  /**
   * Open the rows-per-page popover and pick `newValue`, then wait for the
   * button label to update.
   */
  async changeRowsPerPageTo(newValue: number): Promise<void> {
    await this.page.testSubj.click(ROWS_PER_PAGE_BUTTON_TEST_SUBJ);
    await this.page.testSubj.click(`tablePagination-${newValue}-rows`);
    await this.checkCurrentRowsPerPageToBe(newValue);
  }

  /**
   * The visible text of every currently-rendered row in the grid, in display
   * order, with line breaks collapsed. Mirrors FTR `dataGrid.getRowsText()`.
   */
  async getRowsText(): Promise<string[]> {
    const rows = this.page.locator('[data-test-subj="docTable"] .euiDataGridRow');
    // Grid rows render asynchronously after a search resolves; wait for at
    // least one row to be attached so callers don't see a transient empty
    // array when called immediately after `waitUntilSearchingHasFinished()`.
    // Use a row-index-scoped selector so this resolves to a single element
    // (Locator.waitFor enforces strict mode and the bare `.euiDataGridRow`
    // locator typically matches multiple rows once the grid has rendered).
    await this.page
      .locator('[data-test-subj="docTable"] .euiDataGridRow[data-grid-row-index="0"]')
      .waitFor({ state: 'attached' });
    // Use `textContent` (via `evaluateAll`) instead of `allInnerTexts()`.
    // `innerText` injects synthetic `\t` between flex/grid cells and `\n`
    // between rows, which leaks into row text and breaks the FTR-parity
    // assertions. `textContent` returns the concatenated cell text without
    // those synthetic separators — matching what FTR's WebDriver
    // `getVisibleText()` produces here.
    const texts = await rows.evaluateAll((els) =>
      els.map((el) => {
        const raw = el.textContent ?? '';
        // Build the strip set from char codes so Babel/Playwright source
        // serialization can't mangle escape sequences:
        //   9  = \t,  10 = \n,  13 = \r,  21A6 = ↦ (EUI screen-reader tab),
        //   21B5 = ↵ (EUI screen-reader newline).
        let out = '';
        for (let i = 0; i < raw.length; i++) {
          const code = raw.charCodeAt(i);
          if (code === 9 || code === 10 || code === 13 || code === 0x21a6 || code === 0x21b5) {
            continue;
          }
          out += raw[i];
        }
        // EUI's per-cell screen-reader instruction string — not part of the
        // visible cell value.
        return out
          .split("Press the Enter key to interact with this cell's contents.")
          .join('')
          .trim();
      })
    );
    return texts;
  }

  /**
   * Open the per-column action menu for `field` and click the menu item
   * whose visible text is `sortText` (e.g. `'Sort Old-New'`). Mirrors FTR
   * `dataGrid.clickDocSortAsc(field, sortText)` / `clickDocSortDesc`.
   *
   * The header-cell action button is only revealed on hover, so we hover
   * the cell first before clicking. The action-button test-subj is
   * `dataGridHeaderCellActionButton-<field>`.
   */
  async sortByField(field: string, sortText: string): Promise<void> {
    await this.page.testSubj.hover(`dataGridHeaderCell-${field}`);
    await this.page.testSubj.click(`dataGridHeaderCellActionButton-${field}`);
    await this.page.testSubj.waitForSelector(`dataGridHeaderCellActionGroup-${field}`, {
      state: 'visible',
    });
    await this.page.getByRole('button', { name: sortText }).click();
  }

  /**
   * Open the doc-viewer flyout for the row at `rowIndex`. Mirrors FTR
   * `dataGrid.clickRowToggle({ rowIndex })`. The expand toggle is scoped to
   * the matching `.euiDataGridRow[data-grid-visible-row-index=...]` so it
   * targets exactly one row even when the grid has many.
   *
   * Pass `container` to scope the toggle lookup to a specific data grid —
   * required when multiple grids are visible (e.g. a dashboard with two
   * embedded saved searches), where the bare selector would resolve to
   * multiple elements and trip Playwright's strict-mode check.
   */
  async clickRowToggle({
    rowIndex = 0,
    container,
  }: { rowIndex?: number; container?: Locator } = {}): Promise<void> {
    const scope = container ?? this.page;
    const toggle = scope.locator(
      `.euiDataGridRow[data-grid-visible-row-index="${rowIndex}"] [data-test-subj="docTableExpandToggleColumn"]`
    );
    await toggle.scrollIntoViewIfNeeded();
    await toggle.click();
    await expect(this.page.testSubj.locator('docViewerFlyout')).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Open the column-header action menu for `field` and click "Edit data
   * view field". Mirrors FTR `dataGrid.clickEditField(field)`.
   */
  async clickEditField(field: string): Promise<void> {
    await this.page.testSubj.hover(`dataGridHeaderCell-${field}`);
    await this.page.testSubj.click(`dataGridHeaderCellActionButton-${field}`);
    await this.page.testSubj.waitForSelector(`dataGridHeaderCellActionGroup-${field}`, {
      state: 'visible',
    });
    await this.page.testSubj.click('gridEditFieldButton');
  }

  /**
   * Visible text of the cell at (`rowIndex`, `columnName`). Mirrors FTR
   * `dataGrid.getAllCellElementsByColumnName(rowIndex, columnName)` for the
   * single-grid case. Returns inner text with the EUI cell padding wrapper
   * stripped.
   *
   * The cell carries `data-gridcell-column-id="<columnName>"` and
   * `data-gridcell-visible-row-index="<rowIndex>"`.
   */
  async getCellTextByColumnName(rowIndex: number, columnName: string): Promise<string> {
    const cell = this.page.locator(
      `[data-test-subj="euiDataGridBody"] [data-test-subj="dataGridRowCell"][data-gridcell-column-id="${columnName}"][data-gridcell-visible-row-index="${rowIndex}"]`
    );
    await expect(cell).toBeVisible();
    return ((await cell.textContent()) ?? '').trim();
  }
}
