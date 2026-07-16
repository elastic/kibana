/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escapeRegExp } from 'lodash';
import type { ScoutPage } from '@kbn/scout';
import { DataGrid } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

/**
 * Page object for the ES|QL `LOOKUP JOIN` lookup-index editor flyout. Plugin
 * local since this feature is Discover/ES|QL specific; promote to
 * `@kbn/scout` if a second consumer needs it.
 */
export class IndexEditor {
  private readonly dataGrid: DataGrid;

  constructor(private readonly page: ScoutPage) {
    this.dataGrid = new DataGrid(page);
  }

  async getColumnNames(): Promise<string[]> {
    const headers = await this.page.testSubj.locator('indexEditorColumnNameButton').all();
    return Promise.all(headers.map((header) => header.innerText()));
  }

  /**
   * Selects an exact field-type option from the `indexEditorColumnTypeSelect`
   * combo box. Uses an anchored regex instead of `EuiComboBoxWrapper` because
   * several type labels are substrings of others (e.g. "Keyword" /
   * "Constant keyword", "Text" / "Match only text"), which the wrapper's
   * loose (non-exact) role matching can't disambiguate.
   */
  private async selectColumnType(type: string): Promise<void> {
    const combo = this.page.testSubj.locator('indexEditorColumnTypeSelect');
    await combo.click();
    await combo.locator('input').fill(type);

    // Match the option's rendered label exactly (via EUI's `renderOption`
    // content class), not the full option/accessible name — the latter also
    // includes the field-type icon's own (duplicate) label, which breaks
    // exact matching, and loose matching is ambiguous for short labels that
    // are substrings of others (e.g. "Keyword" / "Constant keyword").
    const exactType = new RegExp(`^\\s*${escapeRegExp(type)}\\s*$`);
    const option = this.page.locator('[role="option"]').filter({
      has: this.page.locator('.euiComboBoxOption__renderOption', { hasText: exactType }),
    });
    await expect(option).toBeVisible();
    await option.click();
  }

  async setColumn(name: string, type: string, columnIndex: number): Promise<void> {
    const headers = await this.page.testSubj.locator('indexEditorColumnNameButton').all();
    await headers[columnIndex].click();
    await this.selectColumnType(type);
    await this.page.testSubj.fill('indexEditorColumnNameInput', name);
    await this.page.keyboard.press('Enter');
  }

  async addColumn(name: string, type: string): Promise<void> {
    await this.page.testSubj.click('indexEditorAddColumnButton');
    await this.selectColumnType(type);
    await this.page.testSubj.fill('indexEditorColumnNameInput', name);
    await this.page.keyboard.press('Enter');
  }

  async deleteColumn(name: string): Promise<void> {
    await this.dataGrid.openColumnMenuByField(name);
    await this.page.testSubj.click('indexEditorDeleteColumnButton');
  }

  async setCellValue(rowIndex: number, columnIndex: number, value: string): Promise<void> {
    await this.page.testSubj.click(`indexEditorCellValue-${rowIndex}-${columnIndex}`);
    const input = this.page.testSubj.locator('indexEditorCellValueInput');
    await input.fill(value);
    await this.page.keyboard.press('Enter');
  }

  async addRow(rowIndex: number): Promise<void> {
    // Hover the row via its (always-rendered) selection checkbox to reveal the
    // row-level "add row" control, then click it. The add-row button itself
    // only renders once the row is hovered, so it can't be targeted directly.
    const checkbox = this.page.locator(
      `[data-grid-visible-row-index="${rowIndex}"] input[type="checkbox"]`
    );
    await checkbox.hover();
    await this.page.testSubj.click('indexEditorAddRowButton');
  }

  async deleteRow(rowIndex: number): Promise<void> {
    await this.dataGrid.selectRow(rowIndex);
    await this.dataGrid.openSelectedRowsMenu();
    await this.page.testSubj.click('indexEditorDeleteDocs');
  }

  async saveChangesAndClose(): Promise<void> {
    await this.page.testSubj.click('indexEditorSaveAndCloseButton');
    await expect(this.page.testSubj.locator('lookupIndexFlyout')).toBeHidden();
  }

  async saveChanges(): Promise<void> {
    await this.page.testSubj.click('indexEditorSaveChangesButton');
    await expect(this.page.testSubj.locator('indexEditorSaveChangesButton')).toBeHidden();
  }

  async closeIndexEditor(): Promise<void> {
    await this.page.testSubj.click('indexEditorCloseButton');
  }

  async uploadFile(filePath: string): Promise<void> {
    await this.page.testSubj.locator('indexEditorFileInput').setInputFiles(filePath);
  }

  async search(query: string): Promise<void> {
    const input = this.page.testSubj.locator('indexEditorQueryBar');
    await input.click();
    await input.fill(query);
    await this.page.keyboard.press('Enter');
  }
}
