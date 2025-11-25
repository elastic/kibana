/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { subj } from '@kbn/test-subj-selector';
import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import type { ScoutPage } from '../fixtures/scope/test/scout_page';
import { resolveSelector, type SelectorInput } from '../utils';

// https://eui.elastic.co/docs/components/tables/data-grid/
export class EuiDataGridWrapper {
  private readonly page: ScoutPage;
  private readonly dataGridWrapper: Locator;
  private readonly toolbarFullScreenButton: Locator;
  private readonly toolbarDisplaySelectorButton: Locator;
  private readonly toolbarColumnSelectorButton: Locator;
  private readonly headerCells: Locator;
  private readonly rows: Locator;
  private readonly expansionPopover: Locator;
  private readonly popoverPanel: Locator;

  /**
   * Create a new EuiDataGridWrapper instance.
   * new EuiDataGridWrapper(page, { dataTestSubj: 'docTable' })
   * new EuiDataGridWrapper(page, 'docTable') // backward compatibility
   * new EuiDataGridWrapper(page, { locator: '.euiDataGrid' })
   */
  constructor(page: ScoutPage, selector: SelectorInput) {
    this.page = page;
    this.dataGridWrapper = resolveSelector(page, selector);

    // Toolbar elements
    this.toolbarFullScreenButton = this.dataGridWrapper.locator(subj('dataGridFullScreenButton'));
    this.toolbarDisplaySelectorButton = this.dataGridWrapper.locator(
      subj('dataGridDisplaySelectorButton')
    );
    this.toolbarColumnSelectorButton = this.dataGridWrapper.locator(
      subj('dataGridColumnSelectorButton')
    );

    // Grid elements
    this.headerCells = this.dataGridWrapper.locator(
      '.euiDataGridHeaderCell:not(.euiDataGridHeaderCell--controlColumn)'
    );
    this.rows = this.dataGridWrapper.locator('.euiDataGridRow');
    this.expansionPopover = this.page.testSubj.locator('euiDataGridExpansionPopover');

    // EuiPanel wrapper (if exists)
    this.popoverPanel = this.page.locator('div[data-popover-panel="true"]');
  }

  private async ensureGridVisible(): Promise<void> {
    await this.dataGridWrapper.waitFor({ state: 'visible' });
  }

  private getColumnHeaderLocator(columnName: string): Locator {
    return this.dataGridWrapper.locator(
      `.euiDataGridHeaderCell[data-test-subj="dataGridHeaderCell-${columnName.toLowerCase()}"]`
    );
  }

  private getCellLocatorByColIndex(rowIndex: number, columnIndex: number): Locator {
    if (rowIndex <= 0 || columnIndex <= 0) {
      throw new Error('Invalid row or column index: must be greater than 0');
    }

    const row = this.dataGridWrapper.locator(`.euiDataGridRow[data-grid-row-index="${rowIndex}"]`);
    return row.locator(`.euiDataGridRowCell[data-gridcell-column-index="${columnIndex - 1}"]`);
  }

  private async waitForContextMenu(): Promise<Locator> {
    const contextMenu = this.page.locator(subj('^dataGridHeaderCellActionGroup'));
    await contextMenu.waitFor({ state: 'visible' });
    return contextMenu;
  }

  async doActionOnColumn(columnName: string, actionName: string) {
    await this.ensureGridVisible();

    const columnField = this.getColumnHeaderLocator(columnName);
    await columnField.waitFor({ state: 'visible' });
    //  It is important to focus and hover on header cell before button interactions
    // Otherwise 'columnField' or 'actionButton' may be outside viewport and not interactable
    await columnField.focus();
    await columnField.hover();

    const actionButton = columnField.locator('.euiDataGridHeaderCell__button');
    await actionButton.scrollIntoViewIfNeeded();
    await actionButton.waitFor({ state: 'visible', timeout: 5000 });

    try {
      await actionButton.click({ timeout: 5000 });
    } catch {
      // eslint-disable-next-line playwright/no-force-option
      await actionButton.click({ force: true });
    }

    const contextMenu = await this.waitForContextMenu();
    await contextMenu.locator(`.euiListGroupItem__label[title="${actionName}"]`).click();
    await contextMenu.waitFor({ state: 'hidden' });
  }

  getCellLocatorByColId(rowIndex: number, colId: string): Locator {
    return this.rows.locator(
      `[data-gridcell-column-id="${colId}"][data-gridcell-row-index="${rowIndex}"]`
    );
  }

  async expandCell(rowIndex: number, columnIndex: number) {
    await this.ensureGridVisible();

    const cell = this.getCellLocatorByColIndex(rowIndex, columnIndex);
    await expect(cell, `Cell at [${rowIndex}, ${columnIndex}] is not visible`).toBeVisible({
      timeout: 2500,
    });

    // Scroll into view and hover to reveal cell actions
    await cell.scrollIntoViewIfNeeded();
    await cell.hover();

    const cellActionsWrapper = cell.locator('.euiDataGridRowCell__actionsWrapper');
    await cellActionsWrapper.waitFor({ state: 'visible' });
    await cellActionsWrapper.locator('.euiDataGridRowCell__expandCell').click();

    await this.expansionPopover.waitFor({ state: 'visible' });
  }

  async getColumnsNames() {
    await this.ensureGridVisible();
    return await this.headerCells.locator('.euiDataGridHeaderCell__content').allTextContents();
  }

  async getRowsCount() {
    await this.ensureGridVisible();
    return await this.rows.count();
  }

  /**
   * Process all rows from the data grid, handling virtualization if present.
   * For virtualized grids, scrolls through and processes each row as it's encountered.
   * @param processRowCallback Callback function that processes each row locator and optional row index
   * @param maxScrolls Maximum number of scroll attempts (default: 100)
   * @param scrollDelayMs Delay in milliseconds after each scroll to allow rendering (default: 100ms)
   */
  async processAllVirtualizedRows(
    processRowCallback: (row: Locator, rowIndex?: string) => Promise<void> | void,
    maxScrolls = 100,
    scrollDelayMs = 100
  ): Promise<void> {
    await this.ensureGridVisible();

    // Check if the data grid wrapper has the virtualized class or contains a virtualized element
    const virtualizedLocator = this.dataGridWrapper.locator('.euiDataGrid__virtualized');
    const isVirtualized = (await virtualizedLocator.count()) > 0;

    if (!isVirtualized) {
      // Non-virtualized grid: process all rows directly
      const allRows = await this.rows.all();
      for (const row of allRows) {
        const rowIndex = await row.getAttribute('data-grid-row-index');
        await processRowCallback(row, rowIndex || undefined);
      }
      return;
    }

    // Virtualized grid: scroll through and process rows as we encounter them
    const seenRowIndices = new Set<string>();
    let previousRowCount = 0;
    let scrollAttempts = 0;

    while (scrollAttempts < maxScrolls) {
      // Get all currently visible rows
      const currentRows = await this.rows.all();
      const currentRowCount = currentRows.length;

      // Process each row that we haven't seen yet
      for (const row of currentRows) {
        const rowIndex = await row.getAttribute('data-grid-row-index');
        if (rowIndex !== null && !seenRowIndices.has(rowIndex)) {
          seenRowIndices.add(rowIndex);
          // Process the row immediately while it's still in the DOM
          await processRowCallback(row, rowIndex);
        }
      }

      // If no new rows appeared, we've reached the end
      if (currentRowCount === previousRowCount) {
        break;
      }

      previousRowCount = currentRowCount;
      scrollAttempts++;

      // Scroll to the last visible row to trigger loading more rows
      if (currentRows.length > 0) {
        const lastRow = currentRows[currentRows.length - 1];
        await lastRow.scrollIntoViewIfNeeded();
        // Small delay to allow virtualization to render new rows
        await this.page.waitForTimeout(scrollDelayMs);
      } else {
        break;
      }
    }
  }

  async openFullScreenMode() {
    await this.ensureGridVisible();
    await this.toolbarFullScreenButton.click();
    await expect(this.dataGridWrapper).toContainClass('euiDataGrid--fullScreen');
  }

  async closeFullScreenMode() {
    await this.ensureGridVisible();
    await this.toolbarFullScreenButton.click();
    await expect(this.dataGridWrapper).not.toContainClass('euiDataGrid--fullScreen');
  }

  async openDisplaySelector() {
    await this.ensureGridVisible();
    await this.toolbarDisplaySelectorButton.click();
    await expect(this.popoverPanel).toBeVisible();
  }

  async openColumnSelector() {
    await this.ensureGridVisible();
    await this.toolbarColumnSelectorButton.click();
    await expect(this.popoverPanel).toBeVisible();
  }
}
