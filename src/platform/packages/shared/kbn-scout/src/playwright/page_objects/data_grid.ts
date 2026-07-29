/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from '../../..';
import type { ScoutPage } from '..';
import { expect } from '..';

const IN_TABLE_SEARCH_BUTTON_TEST_SUBJ = 'startInTableSearchButton';
const IN_TABLE_SEARCH_INPUT_TEST_SUBJ = 'inTableSearchInput';
const IN_TABLE_SEARCH_COUNTER_TEST_SUBJ = 'inTableSearchMatchesCounter';
const IN_TABLE_SEARCH_NEXT_BUTTON_TEST_SUBJ = 'inTableSearchButtonNext';
const IN_TABLE_SEARCH_HIGHLIGHT_CLASS_NAME = 'dataGridInTableSearch__match';

export type DataGridDensity = 'Compact' | 'Normal' | 'Expanded';
export type DataGridRowHeight = 'Auto' | 'Custom';
export type DataGridComparisonDiffMode = 'Full value' | 'By character' | 'By word' | 'By line';
export type DataGridPaginationScope = 'discover' | 'docViewer';

export class DataGrid {
  constructor(private readonly page: ScoutPage) {}

  private getRowSelectionCheckbox(rowIndex: number): Locator {
    return this.page.locator(
      `[data-grid-visible-row-index="${rowIndex}"] [data-gridcell-column-id="select"] input[type="checkbox"]`
    );
  }

  private async readHeaderLabels(scope: Locator, limit: number): Promise<string[]> {
    const headerCellContent = scope.locator(
      '.euiDataGridHeaderCell:not(.euiDataGridHeaderCell--controlColumn) .euiDataGridHeaderCell__content'
    );

    const labels = await headerCellContent.allInnerTexts();
    return labels
      .map((label) => label.trim())
      .filter(Boolean)
      .slice(0, limit);
  }

  private async resizeColumn(
    field: string,
    delta: number
  ): Promise<{ originalWidth: number; newWidth: number }> {
    const originalWidth = await this.getColumnWidth(field);
    const header = this.getColumnHeader(field);
    const headerBox = await header.boundingBox();
    if (!headerBox) {
      throw new Error(`Unable to find column header for field ${field}`);
    }

    const startX = headerBox.x + headerBox.width - 1;
    const startY = headerBox.y + headerBox.height / 2;

    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX + delta, startY, { steps: 5 });
    await this.page.mouse.up();

    await expect.poll(() => this.getColumnWidth(field)).not.toBe(originalWidth);

    return { originalWidth, newWidth: await this.getColumnWidth(field) };
  }

  private async waitUntilFieldListHasCountOfFields() {
    await this.page.testSubj.waitForSelector('fieldListGroupedAvailableFields-countLoading', {
      state: 'hidden',
    });
  }

  private getPaginationContainer(scope: DataGridPaginationScope = 'discover'): Locator {
    return this.page.testSubj.locator(
      scope === 'docViewer' ? 'UnifiedDocViewerTableGrid' : 'docTable'
    );
  }

  async addFieldFromSidebar(field: string) {
    await this.waitUntilFieldListHasCountOfFields();
    await this.page.testSubj.fill('fieldListFiltersFieldSearch', field);
    await this.page.testSubj.click(`fieldToggle-${field}`);
    await this.waitForLoad();
  }

  async changeRowsPerPageTo(rowsPerPage: number, scope: DataGridPaginationScope = 'discover') {
    await this.getPaginationContainer(scope)
      .locator('[data-test-subj="tablePaginationPopoverButton"]')
      .click();
    const option = this.page.testSubj.locator(`tablePagination-${rowsPerPage}-rows`);
    await option.waitFor({ state: 'visible' });
    await option.click();
    await this.page.testSubj.waitForSelector(`tablePagination-${rowsPerPage}-rows`, {
      state: 'hidden',
    });
  }

  async closeInTableSearch() {
    const input = this.getInTableSearchInput();

    await input.press('Escape');

    await input.waitFor({ state: 'hidden' });
    await this.page.testSubj
      .locator(IN_TABLE_SEARCH_BUTTON_TEST_SUBJ)
      .waitFor({ state: 'visible' });
  }

  async expandCell({ rowIndex, columnId }: { rowIndex: number; columnId: string }) {
    const cell = this.getCell(rowIndex, columnId);
    await cell.hover();
    await cell.locator('[data-test-subj="euiDataGridCellExpandButton"]').click();
    await this.page.testSubj.waitForSelector('euiDataGridExpansionPopover', { state: 'visible' });
  }

  async expandMetaFieldsSection() {
    const metaFieldsSection = this.page.testSubj.locator('fieldListGroupedMetaFields');
    const metaFieldsButton = metaFieldsSection.getByRole('button', { name: /Meta fields/ });

    await metaFieldsButton.click();
    await metaFieldsButton.waitFor({ state: 'visible' });
    await expect(metaFieldsButton).toHaveAttribute('aria-expanded', 'true');
  }

  getCell(rowIndex: number, columnId: string): Locator {
    return this.page.locator(
      `[data-grid-visible-row-index="${rowIndex}"] [data-gridcell-column-id="${columnId}"]`
    );
  }

  /**
   * Returns the leaf value node of a data-grid cell. Prefer this over
   * `getCell` when asserting on the rendered value: the gridcell wrapper's
   * text content concatenates child nodes (adding stray newlines), whereas the
   * value node holds the formatted value exactly.
   */
  getCellValue(rowIndex: number, columnId: string): Locator {
    return this.getCell(rowIndex, columnId).locator('.unifiedDataTable__cellValue');
  }

  getColumnHeader(name: string): Locator {
    return this.page.testSubj.locator(`dataGridHeaderCell-${name}`);
  }

  async getColumnTitles(
    scope: Locator = this.page.testSubj.locator('docTable')
  ): Promise<string[]> {
    return this.readHeaderLabels(scope, Number.MAX_SAFE_INTEGER);
  }

  async getColumnWidth(field: string): Promise<number> {
    const header = this.getColumnHeader(field);
    await header.waitFor({ state: 'visible' });

    const headerBox = await header.boundingBox();
    if (!headerBox) {
      throw new Error(`Unable to measure column width for field ${field}`);
    }

    return headerBox.width;
  }

  async getCurrentDensityValue(): Promise<DataGridDensity> {
    const buttonGroup = this.page.testSubj.locator('densityButtonGroup');
    await buttonGroup.waitFor({ state: 'visible' });

    const selectedButton = buttonGroup.locator('[aria-pressed="true"]');
    await selectedButton.waitFor({ state: 'visible' });

    return (await selectedButton.innerText()).trim() as DataGridDensity;
  }

  getPageButton(pageIndex: number, scope: DataGridPaginationScope = 'discover'): Locator {
    return this.getPaginationContainer(scope).locator(
      `[data-test-subj="pagination-button-${pageIndex}"]`
    );
  }

  getCurrentPageButton(scope: DataGridPaginationScope = 'discover'): Locator {
    return this.getPaginationContainer(scope).locator(
      '[data-test-subj^="pagination-button-"][aria-current="page"]'
    );
  }

  async getCurrentRowHeight(scope: 'row' | 'header' = 'row'): Promise<DataGridRowHeight> {
    const buttonGroup = this.page.testSubj.locator(
      `unifiedDataTable${scope === 'header' ? 'Header' : ''}RowHeightSettings_rowHeightButtonGroup`
    );
    await buttonGroup.waitFor({ state: 'visible' });

    const selectedButton = buttonGroup.locator('.euiButtonGroupButton-isSelected');
    await selectedButton.waitFor({ state: 'visible' });

    return (await selectedButton.innerText()).trim() as DataGridRowHeight;
  }

  async getCurrentRowsPerPage(scope: DataGridPaginationScope = 'discover'): Promise<number> {
    const buttonText = await this.getPaginationContainer(scope)
      .locator('[data-test-subj="tablePaginationPopoverButton"]')
      .innerText();
    const rowsPerPage = buttonText.match(/Rows per page:\s*(\d+)/)?.[1];

    if (!rowsPerPage) {
      throw new Error(`Unable to parse rows per page from "${buttonText}"`);
    }

    return Number(rowsPerPage);
  }

  async getCurrentPageNumber(scope: DataGridPaginationScope = 'discover'): Promise<string> {
    const currentPage = this.getCurrentPageButton(scope);
    await currentPage.waitFor({ state: 'visible' });
    const pageNumber = await currentPage.evaluate((element) => element.textContent?.trim() ?? '');
    if (!pageNumber) {
      throw new Error('Unable to read current pagination page number');
    }
    return pageNumber;
  }

  async getCurrentSampleSize(): Promise<number> {
    const input = this.page.locator(
      '[data-test-subj="unifiedDataTableSampleSizeInput"][type="number"]'
    );
    await input.waitFor({ state: 'visible' });

    return Number(await input.inputValue());
  }

  async getDataGridFooterText(): Promise<string> {
    const footer = this.page.testSubj.locator('unifiedDataTableFooter');
    await footer.waitFor({ state: 'visible' });

    return footer.innerText();
  }

  async getDataGridHeaderFieldTokens(limit = 10): Promise<string[]> {
    await this.waitForDocTableRendered();
    const header = this.page.testSubj
      .locator('euiDataGridBody')
      .locator('[data-test-subj="dataGridHeader"]');
    await header.waitFor({ state: 'visible' });
    return this.readHeaderLabels(header, limit);
  }

  async getDocTableRowCount(): Promise<number> {
    await this.waitForDocTableRendered();
    const table = this.page.testSubj.locator('docTable');
    await table.waitFor({ state: 'visible' });
    return table.locator('.euiDataGridRowCell--firstColumn').count();
  }

  getDocumentColumnFieldValue(rowIndex: number, fieldName: string): Locator {
    return this.getCell(rowIndex, '_source').locator(
      `.unifiedDataTable__descriptionListTitle:has-text("${fieldName}") + .unifiedDataTable__descriptionListDescription`
    );
  }

  getInTableSearchCellMatches(rowIndex: number, columnId: string): Locator {
    return this.getCell(rowIndex, columnId).locator(`.${IN_TABLE_SEARCH_HIGHLIGHT_CLASS_NAME}`);
  }

  getInTableSearchInput(): Locator {
    return this.page.testSubj.locator(IN_TABLE_SEARCH_INPUT_TEST_SUBJ);
  }

  getInTableSearchMatchesCounter(): Locator {
    return this.page.testSubj.locator(IN_TABLE_SEARCH_COUNTER_TEST_SUBJ);
  }

  async getNumberOfSelectedRows(): Promise<number> {
    const selectedRowsMenu = this.page.testSubj.locator('unifiedDataTableSelectionBtn');
    const hasSelectedRows = await selectedRowsMenu
      .waitFor({ state: 'visible', timeout: 1_000 })
      .then(() => true)
      .catch(() => false);
    if (!hasSelectedRows) {
      return 0;
    }

    const badgeText = await selectedRowsMenu.locator('.euiNotificationBadge').innerText();
    return Number(badgeText);
  }

  async getNumberOfSelectedRowsOnCurrentPage(): Promise<number> {
    return this.page
      .locator('.euiDataGridRow [data-gridcell-column-id="select"] input[type="checkbox"]:checked')
      .count();
  }

  async goToLastSamplePage(sampleSize: number, rowsPerPage: number) {
    const lastPageNumber = Math.ceil(sampleSize / rowsPerPage) - 1;
    await this.page.keyboard.press('Escape');

    if (lastPageNumber > 0) {
      await this.page.testSubj.click(`pagination-button-${lastPageNumber}`);
    }

    await this.waitForLoad();
  }

  async goToNextInTableSearchMatch() {
    const counter = this.getInTableSearchMatchesCounter();
    const previousCounter = (await counter.textContent()) ?? '';

    await this.page.testSubj.locator(IN_TABLE_SEARCH_NEXT_BUTTON_TEST_SUBJ).click();

    await expect(counter).not.toHaveText(previousCounter);
  }

  async getInTableSearchTerm(): Promise<string | null> {
    const input = this.getInTableSearchInput();
    const isInputOpen = await input
      .waitFor({ state: 'visible', timeout: 1_000 })
      .then(() => true)
      .catch(() => false);
    if (!isInputOpen) {
      return null;
    }
    return input.inputValue();
  }

  async isSelectedRowsMenuVisible(): Promise<boolean> {
    return this.page.testSubj
      .locator('unifiedDataTableSelectionBtn')
      .waitFor({ state: 'visible', timeout: 1_000 })
      .then(() => true)
      .catch(() => false);
  }

  async clickCompareSelectedButton() {
    await this.openSelectedRowsMenu();
    await this.page.testSubj.locator('unifiedDataTableCompareSelectedDocuments').click();
    await this.page.testSubj.locator('unifiedDataTableCompareDocuments').waitFor({
      state: 'visible',
    });
  }

  async isComparisonModeActive(): Promise<boolean> {
    return this.page.testSubj
      .locator('unifiedDataTableCompareDocuments')
      .waitFor({ state: 'visible', timeout: 1_000 })
      .then(() => true)
      .catch(() => false);
  }

  async openComparisonSettings() {
    await this.page.testSubj.locator('unifiedDataTableComparisonSettings').click();
    await this.page.testSubj.locator('unifiedDataTableComparisonSettingsMenu').waitFor({
      state: 'visible',
    });
  }

  async selectComparisonDiffMode(mode: 'basic' | 'chars' | 'words' | 'lines') {
    await this.openComparisonSettings();
    const diffMode = this.page.testSubj.locator(`unifiedDataTableDiffMode-${mode}`);
    await diffMode.click();
    await expect(diffMode).toHaveAttribute('aria-current', 'true');
    await this.page.keyboard.press('Escape');
    await this.page.testSubj
      .locator('unifiedDataTableComparisonSettingsMenu')
      .waitFor({ state: 'hidden' });
  }

  async getComparisonDiffMode(): Promise<DataGridComparisonDiffMode> {
    await this.openComparisonSettings();
    const selectedMode = await this.page
      .locator('[data-test-subj^="unifiedDataTableDiffMode-"][aria-current="true"]')
      .innerText();
    await this.page.keyboard.press('Escape');
    await this.page.testSubj.locator('unifiedDataTableComparisonSettingsMenu').waitFor({
      state: 'hidden',
    });
    return selectedMode.trim() as DataGridComparisonDiffMode;
  }

  async openColumnMenuByField(field: string) {
    await expect(async () => {
      await this.page.testSubj.hover(`dataGridHeaderCell-${field}`);
      await this.page.testSubj.click(`dataGridHeaderCellActionButton-${field}`);
      await this.page.testSubj.locator(`dataGridHeaderCellActionGroup-${field}`).waitFor({
        state: 'visible',
      });
    }).toPass();
  }

  async openDocumentDetails({ rowIndex }: { rowIndex: number }) {
    const expandButton = this.page.locator(
      `[data-grid-visible-row-index="${rowIndex}"] [data-test-subj="docTableExpandToggleColumn"]`
    );

    await expandButton.waitFor({ state: 'visible' });
    await expandButton.scrollIntoViewIfNeeded();
    await expandButton.hover();
    await expandButton.click({ delay: 50 });
  }

  async openGridDisplaySettings() {
    await this.page.testSubj.click('dataGridDisplaySelectorButton');
  }

  async openInTableSearch() {
    const input = this.getInTableSearchInput();

    await this.page.testSubj.locator(IN_TABLE_SEARCH_BUTTON_TEST_SUBJ).click();
    await input.waitFor({ state: 'visible' });
  }

  async openSelectedRowsMenu() {
    await this.page.testSubj.click('unifiedDataTableSelectionBtn');
    await this.page.testSubj.waitForSelector('unifiedDataTableSelectionMenu', { state: 'visible' });
  }

  async resetColumnWidth(field: string) {
    await this.openColumnMenuByField(field);
    await this.page.testSubj.click('unifiedDataTableResetColumnWidth');
  }

  async resizeColumnInDashboard(
    field: string,
    delta: number
  ): Promise<{ originalWidth: number; newWidth: number }> {
    return this.resizeColumn(field, delta);
  }

  async resizeColumnInDiscover(
    field: string,
    delta: number
  ): Promise<{ originalWidth: number; newWidth: number }> {
    return this.resizeColumn(field, delta);
  }

  async runInTableSearch(searchTerm: string) {
    await this.openInTableSearch();

    await this.setInTableSearchTerm(searchTerm);
  }

  async setInTableSearchTerm(searchTerm: string) {
    const counter = this.getInTableSearchMatchesCounter();
    const previousCounter = (await counter.textContent()) ?? '';

    await this.getInTableSearchInput().fill(searchTerm);
    await expect(counter).not.toHaveText(previousCounter);
  }

  async selectRow(rowIndex: number, { pressShiftKey }: { pressShiftKey?: boolean } = {}) {
    const checkbox = this.getRowSelectionCheckbox(rowIndex);
    await checkbox.click({ modifiers: pressShiftKey ? ['Shift'] : [] });
  }

  async setDensityValue(newValue: DataGridDensity) {
    const buttonGroup = this.page.testSubj.locator('densityButtonGroup');

    await buttonGroup.waitFor({ state: 'visible' });
    await buttonGroup.locator(`[data-text="${newValue}"]`).click();
  }

  async setRowHeight(newValue: DataGridRowHeight, scope: 'row' | 'header' = 'row') {
    const buttonGroup = this.page.testSubj.locator(
      `unifiedDataTable${scope === 'header' ? 'Header' : ''}RowHeightSettings_rowHeightButtonGroup`
    );

    await buttonGroup.waitFor({ state: 'visible' });
    await buttonGroup.locator(`[data-text="${newValue}"]`).click();
  }

  async setSampleSize(newValue: number) {
    const input = this.page.locator(
      '[data-test-subj="unifiedDataTableSampleSizeInput"][type="number"]'
    );
    await input.waitFor({ state: 'visible' });
    await input.fill(newValue.toString());
    await input.press('Enter');
    await this.waitForLoad();
    await this.page.keyboard.press('Escape');
  }

  async waitForDocTableRendered() {
    const table = this.page.testSubj.locator('discoverDocTable');
    const minDurationMs = 2_000;
    const pollIntervalMs = 100;
    const totalTimeoutMs = 30_000;

    await table.waitFor({ state: 'visible', timeout: totalTimeoutMs });

    let stableSince: number | null = null;

    await expect
      .poll(
        async () => {
          const attr = await table.getAttribute('data-render-complete');
          const now = Date.now();

          if (attr === 'true') {
            if (!stableSince) {
              stableSince = now;
            }
            return now - stableSince >= minDurationMs;
          }

          stableSince = null;
          return false;
        },
        {
          message: `data-render-complete did not stay 'true' for ${minDurationMs}ms`,
          timeout: totalTimeoutMs,
          intervals: [pollIntervalMs],
        }
      )
      .toBe(true);
  }

  async waitForLoad() {
    try {
      await this.page.testSubj.waitForSelector('discoverDataGridUpdating', {
        state: 'visible',
        timeout: 2_000,
      });
    } catch {
      // Indicator never appeared — assume nothing was in flight.
    }
    await this.page.testSubj.waitForSelector('discoverDataGridUpdating', {
      state: 'hidden',
      timeout: 30_000,
    });
  }
}
