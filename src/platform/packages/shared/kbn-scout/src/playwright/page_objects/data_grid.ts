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

export type DataGridDensity = 'Compact' | 'Normal' | 'Expanded';
export type DataGridRowHeight = 'Auto' | 'Custom';

export class DataGrid {
  constructor(private readonly page: ScoutPage) {}

  private getRowSelectionCheckbox(rowIndex: number): Locator {
    return this.page.locator(
      `[data-grid-visible-row-index="${rowIndex}"] [data-gridcell-column-id="select"] input[type="checkbox"]`
    );
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

    await expect(expandButton).toBeVisible();
    await expandButton.scrollIntoViewIfNeeded();
    await expandButton.hover();
    await expandButton.click({ delay: 50 });
  }

  private async readFieldTokenLabels(scope: Locator, limit: number): Promise<string[]> {
    return scope
      .locator('.kbnFieldIcon svg')
      .evaluateAll(
        (icons, max) => icons.slice(0, max).map((icon) => icon.getAttribute('aria-label') ?? ''),
        limit
      );
  }

  private async waitUntilFieldListHasCountOfFields() {
    await this.page.testSubj.waitForSelector('fieldListGroupedAvailableFields-countLoading', {
      state: 'hidden',
    });
  }

  async addFieldFromSidebar(field: string) {
    await this.waitUntilFieldListHasCountOfFields();
    await this.page.testSubj.fill('fieldListFiltersFieldSearch', field);
    await this.page.testSubj.click(`fieldToggle-${field}`);
    await this.waitUntilSearchingHasFinished();
  }

  async changeRowsPerPageTo(rowsPerPage: number) {
    await this.page.testSubj.click('tablePaginationPopoverButton');
    const option = this.page.testSubj.locator(`tablePagination-${rowsPerPage}-rows`);
    await option.waitFor({ state: 'visible' });
    await option.click();
    await this.page.testSubj.waitForSelector(`tablePagination-${rowsPerPage}-rows`, {
      state: 'hidden',
    });
  }

  getColumnHeader(name: string): Locator {
    return this.page.testSubj.locator(`dataGridHeaderCell-${name}`);
  }

  async getColumnWidth(field: string): Promise<number> {
    const header = this.getColumnHeader(field);
    await expect(header).toBeVisible();

    const headerBox = await header.boundingBox();
    if (!headerBox) {
      throw new Error(`Unable to measure column width for field ${field}`);
    }

    return headerBox.width;
  }

  async getCurrentDensityValue(): Promise<DataGridDensity> {
    const buttonGroup = this.page.testSubj.locator('densityButtonGroup');
    await expect(buttonGroup).toBeVisible();

    const selectedButton = buttonGroup.locator('[aria-pressed="true"]');
    await expect(selectedButton).toBeVisible();

    return (await selectedButton.innerText()).trim() as DataGridDensity;
  }

  async getCurrentRowHeight(scope: 'row' | 'header' = 'row'): Promise<DataGridRowHeight> {
    const buttonGroup = this.page.testSubj.locator(
      `unifiedDataTable${scope === 'header' ? 'Header' : ''}RowHeightSettings_rowHeightButtonGroup`
    );
    await expect(buttonGroup).toBeVisible();

    const selectedButton = buttonGroup.locator('.euiButtonGroupButton-isSelected');
    await expect(selectedButton).toBeVisible();

    return (await selectedButton.innerText()).trim() as DataGridRowHeight;
  }

  async getCurrentRowsPerPage(): Promise<number> {
    const buttonText = await this.page.testSubj.innerText('tablePaginationPopoverButton');
    const rowsPerPage = buttonText.match(/Rows per page:\s*(\d+)/)?.[1];

    if (!rowsPerPage) {
      throw new Error(`Unable to parse rows per page from "${buttonText}"`);
    }

    return Number(rowsPerPage);
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
    const header = this.page.testSubj
      .locator('euiDataGridBody')
      .locator('[data-test-subj="dataGridHeader"]');
    return this.readFieldTokenLabels(header, limit);
  }

  async getDocTableRowCount(): Promise<number> {
    await this.waitForDocTableRendered();
    const table = this.page.testSubj.locator('docTable');
    await table.waitFor({ state: 'visible' });
    return table.locator('.euiDataGridRowCell--firstColumn').count();
  }

  async getDocViewerFieldTokens(limit = 10): Promise<string[]> {
    const flyout = this.page.testSubj.locator('docViewerFlyout');
    await flyout.waitFor({ state: 'visible' });
    return this.readFieldTokenLabels(flyout, limit);
  }

  async getNumberOfSelectedRows(): Promise<number> {
    const selectedRowsMenu = this.page.testSubj.locator('unifiedDataTableSelectionBtn');
    if (!(await selectedRowsMenu.isVisible())) {
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

    await this.waitUntilSearchingHasFinished();
  }

  async isSelectedRowsMenuVisible(): Promise<boolean> {
    return this.page.testSubj.locator('unifiedDataTableSelectionBtn').isVisible();
  }

  async openAndWaitForDocViewerFlyout({ rowIndex }: { rowIndex: number }) {
    await this.openDocumentDetails({ rowIndex });
    await this.waitForDocViewerFlyoutOpen();
  }

  async openGridDisplaySettings() {
    await this.page.testSubj.click('dataGridDisplaySelectorButton');
  }

  async expandMetaFieldsSection() {
    const metaFieldsSection = this.page.testSubj.locator('fieldListGroupedMetaFields');
    const metaFieldsButton = metaFieldsSection.getByRole('button', { name: /Meta fields/ });

    await metaFieldsButton.click();
    await expect(metaFieldsButton).toHaveAttribute('aria-expanded', 'true');
  }

  async openSelectedRowsMenu() {
    await this.page.testSubj.click('unifiedDataTableSelectionBtn');
    await this.page.testSubj.waitForSelector('unifiedDataTableSelectionMenu', { state: 'visible' });
  }

  async openSurroundingDocuments(rowIndex: number) {
    await this.openAndWaitForDocViewerFlyout({ rowIndex });
    await this.page.testSubj
      .locator('docViewerFlyout')
      .getByLabel('View surrounding documents')
      .click();
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

  async selectRow(rowIndex: number, { pressShiftKey }: { pressShiftKey?: boolean } = {}) {
    const checkbox = this.getRowSelectionCheckbox(rowIndex);
    await checkbox.click({ modifiers: pressShiftKey ? ['Shift'] : [] });
  }

  async setDensityValue(newValue: DataGridDensity) {
    const buttonGroup = this.page.testSubj.locator('densityButtonGroup');

    await expect(buttonGroup).toBeVisible();
    await buttonGroup.locator(`[data-text="${newValue}"]`).click();
  }

  async setRowHeight(newValue: DataGridRowHeight, scope: 'row' | 'header' = 'row') {
    const buttonGroup = this.page.testSubj.locator(
      `unifiedDataTable${scope === 'header' ? 'Header' : ''}RowHeightSettings_rowHeightButtonGroup`
    );

    await expect(buttonGroup).toBeVisible();
    await buttonGroup.locator(`[data-text="${newValue}"]`).click();
  }

  async setSampleSize(newValue: number) {
    const input = this.page.locator(
      '[data-test-subj="unifiedDataTableSampleSizeInput"][type="number"]'
    );
    await input.waitFor({ state: 'visible' });
    await input.fill(newValue.toString());
    await input.press('Enter');
    await this.waitUntilSearchingHasFinished();
    await this.page.keyboard.press('Escape');
  }

  async waitForDocTableRendered() {
    const table = this.page.testSubj.locator('discoverDocTable');
    const minDurationMs = 2_000;
    const pollIntervalMs = 100;
    const totalTimeoutMs = 30_000;

    await expect(table).toBeVisible({ timeout: totalTimeoutMs });

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

  async waitForDocViewerFlyoutOpen() {
    const docViewer = this.page.testSubj.locator('kbnDocViewer');
    await expect(docViewer).toBeVisible({ timeout: 30_000 });
  }

  async waitUntilSearchingHasFinished() {
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
}
