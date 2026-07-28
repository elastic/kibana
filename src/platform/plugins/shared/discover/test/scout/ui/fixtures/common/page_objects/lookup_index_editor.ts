/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataGrid, KibanaCodeEditorWrapper, Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { escapeRegExp } from 'lodash';

/**
 * Page object for the lookup-join "index editor" flyout
 * (`@kbn/index-editor`), opened from the ES|QL editor's `LOOKUP JOIN`
 * suggestion or the lookup-join badge hover menu.
 *
 * Kept plugin-local (rather than in `@kbn/scout`) because its data grid uses a
 * bespoke `indexEditorCellValue-{rowIndex}-{colIndex}` cell addressing scheme
 * that the generic `DataGrid` page object doesn't support.
 */
export class LookupIndexEditor {
  readonly flyout: Locator;
  private readonly unsavedChangesModal: Locator;

  constructor(private readonly page: ScoutPage, private readonly dataGrid: DataGrid) {
    this.flyout = page.testSubj.locator('lookupIndexFlyout');
    this.unsavedChangesModal = page.testSubj.locator('indexEditorUnsavedChangesModal');
  }

  async waitForOpen(): Promise<void> {
    await this.flyout.waitFor({ state: 'visible' });
  }

  async waitForClosed(): Promise<void> {
    await this.flyout.waitFor({ state: 'hidden' });
  }

  /**
   * Types `query` into the ES|QL editor, triggers Monaco's suggestion widget,
   * and clicks the suggestion whose label contains `suggestionLabel` (e.g. a
   * `Create lookup index "my-index"` suggestion). Waits for the flyout to open.
   */
  async openFromSuggestion(
    codeEditor: KibanaCodeEditorWrapper,
    query: string,
    suggestionLabel: string
  ): Promise<void> {
    await codeEditor.setCodeEditorValue(query);

    const suggestWidget = codeEditor.getCodeEditorSuggestWidget();
    const targetSuggestion = suggestWidget.locator('.monaco-list-row', {
      hasText: suggestionLabel,
    });

    // `triggerSuggest(query)` moves the cursor to the end of `query` first (needed
    // since `setCodeEditorValue` doesn't). Retry the whole trigger, not just the
    // wait: ES|QL re-validates the query asynchronously, so a suggest triggered
    // too early can latch Monaco onto an empty widget that never repopulates.
    await expect(async () => {
      await codeEditor.triggerSuggest(query);
      await expect(targetSuggestion).toBeVisible({ timeout: 1_000 });
    }).toPass();

    await targetSuggestion.click();

    await this.waitForOpen();
  }

  async setIndexName(name: string): Promise<void> {
    await this.page.testSubj.fill('indexNameInput', name);
    await this.page.testSubj.click('indexNameSaveButton');
  }

  async getColumnNames(): Promise<string[]> {
    const columnNameButtons = this.page.testSubj.locator('indexEditorColumnNameButton');
    await expect(columnNameButtons).not.toHaveCount(0);
    return columnNameButtons.allInnerTexts();
  }

  /**
   * Selects `type` in the `indexEditorColumnTypeSelect` combo box.
   *
   * Not the shared combo-box helper: its options each show a field-type icon
   * whose label duplicates the text, so e.g. searching "text" also substring-
   * matches "Semantic text" / "Match only text". Matching the exact (case-
   * insensitive) label text directly avoids the ambiguity.
   */
  private async selectColumnType(type: string): Promise<void> {
    const comboBox = this.page.testSubj.locator('indexEditorColumnTypeSelect');
    await comboBox.getByTestId('comboBoxInput').click();

    const searchField = comboBox.getByTestId('comboBoxSearchInput');
    await searchField.fill(type);

    const option = this.page
      .locator('[data-test-subj~="indexEditorColumnTypeSelect-optionsList"]')
      .locator('.euiComboBoxOption__renderOption', {
        hasText: new RegExp(`^${escapeRegExp(type)}$`, 'i'),
      });
    await expect(option).toHaveCount(1);
    await option.click();
    await searchField.blur();
  }

  /**
   * Renames an unsaved column and sets its type. Addressed by `columnIndex`
   * (the grid's `data-column-index`), not by name: unnamed placeholder
   * columns all share the same "Add a field…" label.
   */
  async setColumn(columnIndex: number, name: string, type: string): Promise<void> {
    await this.page
      .locator(
        `[data-column-index="${columnIndex}"] [data-test-subj="indexEditorColumnNameButton"]`
      )
      .click();
    await this.selectColumnType(type);
    await this.page.testSubj.fill('indexEditorColumnNameInput', name);
    await this.page.testSubj.click('indexEditorColumnNameAcceptButton');
  }

  async addColumn(name: string, type: string): Promise<void> {
    await this.page.testSubj.click('indexEditorAddColumnButton');
    await this.selectColumnType(type);
    await this.page.testSubj.fill('indexEditorColumnNameInput', name);
    await this.page.testSubj.click('indexEditorColumnNameAcceptButton');
  }

  async deleteColumn(name: string): Promise<void> {
    await this.dataGrid.openColumnMenuByField(name);
    await this.page.testSubj.click('indexEditorDeleteColumnButton');
  }

  async setCellValue(rowIndex: number, columnIndex: number, value: string): Promise<void> {
    await this.page.testSubj.click(`indexEditorCellValue-${rowIndex}-${columnIndex}`);
    const input = this.page.testSubj.locator('indexEditorCellValueInput');
    await input.waitFor({ state: 'visible' });
    await input.fill(value);
    await this.page.keyboard.press('Enter');
  }

  /**
   * Adds a new empty row immediately after `afterRowIndex`, via the row's
   * `actions` control-column cell. Uses `this.flyout` rather than
   * `this.dataGrid.getCell()`: the latter is page-wide, and the Discover
   * results grid behind the flyout has the same `actions` column.
   */
  async addRow(afterRowIndex: number): Promise<void> {
    const addRowCell = this.flyout.locator(
      `[data-grid-visible-row-index="${afterRowIndex}"] [data-gridcell-column-id="actions"]`
    );
    await addRowCell.hover();
    await addRowCell.locator('[data-test-subj="indexEditorAddRowButton"]').click();
  }

  /**
   * Selects `rowIndex` and deletes it via the selected-rows menu.
   *
   * Uses `this.flyout`-scoped locators rather than `this.dataGrid.selectRow()`
   * / `.openSelectedRowsMenu()`: the index editor's grid shares the same
   * `UnifiedDataTable` test subjects as Discover's main results grid, so a
   * page-wide locator would match both. The resulting menu is looked up
   * page-wide instead, since EUI renders it into a `document.body` portal
   * outside the flyout (only one can be open at a time, so this stays safe).
   */
  async deleteRow(rowIndex: number): Promise<void> {
    const checkbox = this.flyout.locator(
      `[data-grid-visible-row-index="${rowIndex}"] [data-gridcell-column-id="select"] input[type="checkbox"]`
    );
    await checkbox.click();

    await this.flyout.locator('[data-test-subj="unifiedDataTableSelectionBtn"]').click();
    await this.page.testSubj.locator('unifiedDataTableSelectionMenu').waitFor({ state: 'visible' });

    await this.page.testSubj.click('indexEditorDeleteDocs');
  }

  /**
   * Locator matching one element per rendered grid row (via the
   * selection-checkbox cell). Scoped to `this.flyout`, not `this.page`: the
   * Discover results grid stays mounted behind the flyout and shares the same
   * data-grid attributes, so an unscoped locator would also match its rows.
   * Prefer `expect(rows).toHaveCount(n)` over reading `.count()` directly,
   * since rows load asynchronously.
   */
  public get rows(): Locator {
    return this.flyout.locator('[data-grid-visible-row-index] [data-gridcell-column-id="select"]');
  }

  /**
   * Sets the flyout's KQL filter query. An empty string clears the filter.
   * `indexEditorQueryBar` is on the query bar's `<textarea>` itself.
   */
  async search(query: string): Promise<void> {
    const input = this.page.testSubj.locator('indexEditorQueryBar');
    await input.click();
    await input.fill(query);
    await this.page.keyboard.press('Enter');
  }

  async uploadFile(filePath: string): Promise<void> {
    await this.page.testSubj.locator('indexEditorFileInput').setInputFiles(filePath);
  }

  async saveChangesAndClose(): Promise<void> {
    await this.page.testSubj.click('indexEditorSaveAndCloseButton');
    await this.waitForClosed();
  }

  async saveChanges(): Promise<void> {
    await this.page.testSubj.click('indexEditorSaveChangesButton');
    await this.page.testSubj.locator('indexEditorSaveChangesButton').waitFor({ state: 'hidden' });
  }

  async close(): Promise<void> {
    await this.page.testSubj.click('indexEditorCloseButton');
  }

  async isUnsavedChangesModalVisible(): Promise<boolean> {
    return this.unsavedChangesModal
      .waitFor({ state: 'visible', timeout: 2_000 })
      .then(() => true)
      .catch(() => false);
  }

  /** Discards unsaved changes and closes the flyout from the "Leave without saving?" modal. */
  async confirmCloseWithoutSaving(): Promise<void> {
    await this.page.testSubj.click('confirmModalConfirmButton');
    await this.unsavedChangesModal.waitFor({ state: 'hidden' });
    await this.waitForClosed();
  }

  /** Dismisses the "Leave without saving?" modal to keep editing. */
  async cancelCloseWithoutSaving(): Promise<void> {
    await this.page.testSubj.click('confirmModalCancelButton');
    await this.unsavedChangesModal.waitFor({ state: 'hidden' });
  }
}
