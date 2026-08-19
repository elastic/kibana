/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from '@playwright/test';
import type { ScoutPage } from '@kbn/scout';
import { DataGrid } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

interface MonacoJsonModel {
  getValue(): string;
}

interface MonacoJsonEnvironment {
  MonacoEnvironment?: {
    monaco?: {
      editor?: {
        getModels: () => MonacoJsonModel[];
      };
    };
  };
}

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

  private async readFieldTokenLabels(scope: Locator, limit: number): Promise<string[]> {
    return scope
      .locator('.kbnFieldIcon svg')
      .evaluateAll(
        (icons, max) => icons.slice(0, max).map((icon) => icon.getAttribute('aria-label') ?? ''),
        limit
      );
  }

  async waitForFlyoutOpen() {
    await this.getFlyout().waitFor({ state: 'visible', timeout: 30_000 });
  }

  async openAndWaitForFlyout({ rowIndex }: { rowIndex: number }) {
    await this.dataGrid.openDocumentDetails({ rowIndex });
    await this.waitForFlyoutOpen();
  }

  async close() {
    await this.page.testSubj.click('euiFlyoutCloseButton');
    await this.page.testSubj.waitForSelector('kbnDocViewer', { state: 'hidden' });
  }

  async openTab(tabId: string) {
    await this.page.testSubj.click(`docViewerTab-${tabId}`);
  }

  getFlyout() {
    return this.page.testSubj.locator('kbnDocViewer');
  }

  getTab(tabId: string) {
    return this.page.testSubj.locator(`docViewerTab-${tabId}`);
  }

  async getFieldTokens(limit = 10): Promise<string[]> {
    const flyout = this.page.testSubj.locator('docViewerFlyout');
    await flyout.waitFor({ state: 'visible' });
    return this.readFieldTokenLabels(flyout, limit);
  }

  async getRowActionCount(): Promise<number> {
    const flyout = this.page.testSubj.locator('docViewerFlyout');
    await flyout.waitFor({ state: 'visible' });

    return flyout.locator('[data-test-subj*="docTableRowAction"]').count();
  }

  async getJsonCodeEditorValue(): Promise<string> {
    await this.page
      .getByLabel('Read only JSON view of an elasticsearch document')
      .waitFor({ state: 'visible' });

    const raw = await this.page.evaluate(() => {
      const monacoEnv = (window as unknown as MonacoJsonEnvironment).MonacoEnvironment;

      const models = monacoEnv?.monaco?.editor?.getModels() ?? [];
      return models.find((model) => model.getValue().trim().startsWith('{'))?.getValue();
    });

    if (!raw) {
      throw new Error('DocViewer JSON editor model was not found');
    }

    return raw;
  }

  async readJsonFromCodeEditor<T extends Record<string, unknown>>(): Promise<T> {
    const raw = await this.getJsonCodeEditorValue();
    return JSON.parse(raw) as T;
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

  async getFieldSearchValue(): Promise<string> {
    return this.page.testSubj
      .locator('docViewerFlyout')
      .locator('[data-test-subj="unifiedDocViewerFieldsSearchInput"]')
      .inputValue();
  }

  async getFieldNameCount(): Promise<number> {
    const flyout = this.page.testSubj.locator('docViewerFlyout');
    await flyout.waitFor({ state: 'visible' });
    return flyout.locator('.kbnDocViewer__fieldName').count();
  }

  getFieldNames(): Locator {
    return this.page.testSubj.locator('docViewerFlyout').locator('.kbnDocViewer__fieldName');
  }

  async openFieldTypeFilter() {
    await this.page.testSubj.locator('unifiedDocViewerFieldsTableFieldTypeFilterToggle').click();
    await this.page.testSubj
      .locator('unifiedDocViewerFieldsTableFieldTypeFilterOptions')
      .waitFor({ state: 'visible' });
  }

  async closeFieldTypeFilter() {
    await this.page.testSubj.locator('unifiedDocViewerFieldsTableFieldTypeFilterToggle').click();
    await this.page.testSubj
      .locator('unifiedDocViewerFieldsTableFieldTypeFilterOptions')
      .waitFor({ state: 'hidden' });
  }

  getFieldTypeFilterCountLocator(): Locator {
    return this.page.testSubj.locator('unifiedDocViewerFieldsTableFieldTypeFilterToggle');
  }

  async expectFieldTypeFilterCount(count: string): Promise<void> {
    await expect(this.getFieldTypeFilterCountLocator()).toHaveText(count);
  }

  async clickShowOnlySelectedFieldsSwitch(): Promise<void> {
    await this.page.testSubj.locator('unifiedDocViewerShowOnlySelectedFieldsSwitch').click();
  }

  async expectShowOnlySelectedFields(checked: boolean): Promise<void> {
    await expect(
      this.page.testSubj.locator('unifiedDocViewerShowOnlySelectedFieldsSwitch')
    ).toHaveAttribute('aria-checked', checked ? 'true' : 'false');
  }

  async isSwitchChecked(testSubj: string): Promise<boolean> {
    return (await this.page.testSubj.locator(testSubj).getAttribute('aria-checked')) === 'true';
  }

  async isFieldPinned(fieldName: string): Promise<boolean> {
    return this.page
      .locator(
        `[data-test-subj="unifiedDocViewer_pinControl_${fieldName}"]:not(.kbnDocViewer__fieldsGrid__pinAction)`
      )
      .waitFor({ state: 'attached', timeout: 1_000 })
      .then(() => true)
      .catch(() => false);
  }

  async togglePinAction(fieldName: string) {
    const pinControl = this.page.testSubj.locator(`unifiedDocViewer_pinControl_${fieldName}`);
    const wasPinned = await this.isFieldPinned(fieldName);
    await pinControl.hover();
    await this.page.testSubj
      .locator(`unifiedDocViewer_pinControlButton_${fieldName}`)
      .waitFor({ state: 'visible' });
    await this.page.testSubj.locator(`unifiedDocViewer_pinControlButton_${fieldName}`).click();
    await this.page
      .locator(
        `[data-test-subj="unifiedDocViewer_pinControl_${fieldName}"]${
          wasPinned
            ? '.kbnDocViewer__fieldsGrid__pinAction'
            : ':not(.kbnDocViewer__fieldsGrid__pinAction)'
        }`
      )
      .waitFor({ state: 'attached' });
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
    await this.openTab('doc_view_table');

    const flyout = this.page.testSubj.locator('docViewerFlyout');

    await expect(async () => {
      const nameCell = flyout.locator(`[data-test-subj="tableDocViewRow-${fieldName}-name"]`);
      await nameCell.waitFor({ state: 'visible' });
      await nameCell.evaluate((el) => {
        el.scrollIntoView({ block: 'center', inline: 'nearest' });
      });
      await nameCell.hover();

      const action = flyout.locator(`[data-test-subj="${actionTestSubj}-${fieldName}"]`);
      await action.waitFor({ state: 'visible' });
      await action.scrollIntoViewIfNeeded();
      await action.click();
    }).toPass({ timeout: 15_000 });
  }

  async toggleColumn(fieldName: string) {
    await this.clickFieldActionInTable(fieldName, 'toggleColumnButton');
  }

  async openSurroundingDocuments(rowIndex: number) {
    await this.openAndWaitForFlyout({ rowIndex });
    await this.page.testSubj
      .locator('docViewerFlyout')
      .getByLabel('View surrounding documents')
      .click();
  }

  async openSingleDocument(rowIndex: number) {
    await this.openAndWaitForFlyout({ rowIndex });
    await this.page.testSubj.locator('docViewerFlyout').getByLabel('View single document').click();
    await this.page.testSubj.locator('doc-hit').waitFor({ state: 'visible' });
  }
}
