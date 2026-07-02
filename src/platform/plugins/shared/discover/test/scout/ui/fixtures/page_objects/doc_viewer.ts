/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataGrid, type ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

/**
 * Page object for the unified document viewer flyout that is opened from the
 * data grid (e.g. in Discover). Kept separate from `DataGrid` so grid and
 * doc-viewer concerns stay focused.
 */
export class DocViewer {
  private readonly dataGrid: DataGrid;

  constructor(private readonly page: ScoutPage) {
    this.dataGrid = new DataGrid(page);
  }

  async waitForFlyoutOpen() {
    await this.dataGrid.waitForDocViewerFlyoutOpen();
  }

  async openAndWaitForFlyout({ rowIndex }: { rowIndex: number }) {
    await this.dataGrid.openAndWaitForDocViewerFlyout({ rowIndex });
  }

  async close() {
    await this.dataGrid.closeDocViewerFlyout();
  }

  async openTab(tabId: string) {
    await this.dataGrid.openDocViewerTab(tabId);
  }

  async getFieldTokens(limit = 10): Promise<string[]> {
    return this.dataGrid.getDocViewerFieldTokens(limit);
  }

  async getRowActionCount(): Promise<number> {
    return this.dataGrid.getDocViewerRowActionCount();
  }

  /**
   * Inside an open document-viewer flyout, type a field name into the search
   * input to filter the fields table
   */
  async findFieldByNameOrValue(name: string) {
    const flyout = this.page.testSubj.locator('docViewerFlyout');
    const searchInput = flyout.locator('[data-test-subj="unifiedDocViewerFieldsSearchInput"]');
    await searchInput.fill(name);
    await expect(searchInput).toHaveValue(name, { timeout: 5_000 });
  }

  /**
   * Inside an open document-viewer flyout, click a cell-level action button
   * for a given field (e.g. `addFilterForValueButton`, `addExistsFilterButton`).
   */
  async clickFieldAction(fieldName: string, actionName: string) {
    const isValueAction = ['addFilterForValueButton', 'addFilterOutValueButton'].includes(
      actionName
    );
    const cellTestSubj = isValueAction
      ? `tableDocViewRow-${fieldName}-value`
      : `tableDocViewRow-${fieldName}-name`;

    const flyout = this.page.testSubj.locator('docViewerFlyout');
    await expect(async () => {
      const cell = flyout.locator(`[data-test-subj="${cellTestSubj}"]`);
      await cell.evaluate((el) => {
        el.scrollIntoView({ block: 'center', inline: 'nearest' });
      });
      await cell.hover();

      const actionBtn = flyout.locator(`[data-test-subj="${actionName}-${fieldName}"]`);
      await actionBtn.waitFor({ state: 'visible' });
      await actionBtn.click();
    }).toPass({ timeout: 15_000 });
  }

  /**
   * Opens the fields table tab, then clicks a field-level action button
   * (e.g. `toggleColumnButton`, `addExistsFilterButton`) on the field's name cell.
   */
  async clickFieldActionInTable(fieldName: string, actionTestSubj: string) {
    await this.dataGrid.clickFieldActionInDocViewer(fieldName, actionTestSubj);
  }

  async toggleColumn(fieldName: string) {
    await this.dataGrid.toggleColumnInDocViewer(fieldName);
  }

  async openSurroundingDocuments(rowIndex: number) {
    await this.dataGrid.openSurroundingDocuments(rowIndex);
  }
}
