/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '..';
import { EuiComboBoxWrapper, expect } from '..';

export class LensApp {
  private readonly lensApp;
  private readonly chartSwitchPopover;
  private readonly chartSwitchList;
  private readonly saveAndReturnButton;
  private readonly closeDimensionEditorButton;
  public readonly applyChangesButton;
  private readonly dimensionFieldComboBox;

  constructor(private readonly page: ScoutPage) {
    this.lensApp = this.page.testSubj.locator('lnsApp');
    this.chartSwitchPopover = this.page.testSubj.locator('lnsChartSwitchPopover');
    this.chartSwitchList = this.page.testSubj.locator('lnsChartSwitchList');
    this.saveAndReturnButton = this.page.testSubj.locator('lnsApp_saveAndReturnButton');
    this.closeDimensionEditorButton = this.page.testSubj.locator(
      'lns-indexPattern-dimensionContainerClose'
    );
    this.applyChangesButton = this.page.testSubj.locator('lnsApplyChanges__apply');
    this.dimensionFieldComboBox = new EuiComboBoxWrapper(this.page, 'indexPattern-dimension-field');
  }

  async waitForLensApp() {
    await expect(this.lensApp).toBeVisible();
  }

  async switchToVisualization(visType: string) {
    await this.openChartSwitchPopover();
    await this.page.testSubj.locator(`lnsChartSwitchPopover_${visType}`).click();
  }

  async applyChanges() {
    await this.applyChangesButton.click();
    await expect(this.applyChangesButton).toBeHidden();
  }

  /**
   * Clicks "Save and return" and waits for Lens to close and the dashboard
   * viewport to be visible.
   */
  async saveAndReturn() {
    await expect(this.saveAndReturnButton).toBeVisible();
    await this.saveAndReturnButton.click();
    await expect(this.lensApp).toBeHidden();
    await expect(this.page.testSubj.locator('dshDashboardViewport')).toBeVisible();
  }

  async configureXYDimensions(options?: {
    y?: { operation: string; field?: string };
    x?: { operation: string; field?: string };
    split?: {
      operation: string;
      field?: string;
      palette?: { mode: 'legacy' | 'colorMapping'; id: string };
    };
  }) {
    const y = options?.y ?? { operation: 'average', field: 'bytes' };
    const x = options?.x ?? { operation: 'date_histogram', field: '@timestamp' };
    const split = options?.split ?? { operation: 'terms', field: 'ip' };

    await this.configureDimension({
      dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
      operation: y.operation,
      field: y.field,
    });
    await this.configureDimension({
      dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
      operation: x.operation,
      field: x.field,
    });
    await this.configureDimension({
      dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
      operation: split.operation,
      field: split.field,
      palette: split.palette,
    });
  }

  async configureDimension(opts: {
    dimension: string;
    operation: string;
    field?: string;
    palette?: { mode: 'legacy' | 'colorMapping'; id: string };
    keepOpen?: boolean;
  }) {
    await this.openDimensionEditor(opts.dimension);
    await this.selectOperation(opts.operation);
    if (opts.field) {
      await this.selectField(opts.field);
    }
    if (opts.palette) {
      await this.setPalette(opts.palette.id, opts.palette.mode === 'legacy');
    }
    if (!opts.keepOpen) {
      await this.closeDimensionEditor();
    }
  }

  async openDimensionEditorFor(dimension: string) {
    await this.openDimensionEditor(dimension);
  }

  async closeDimensionEditorPanel() {
    await this.closeDimensionEditor();
  }

  async setTermsNumberOfValues(value: number) {
    const input = this.page.locator('input[data-test-subj="indexPattern-terms-values"]');
    await expect(input).toBeVisible();
    await input.click();
    await input.fill(`${value}`);
    await this.page.keyboard.press('Tab');
    await expect(input).toHaveValue(`${value}`);
  }

  async setTableDynamicColoring(coloringType: 'none' | 'cell' | 'text') {
    await this.page.testSubj.click(`lnsDatatable_dynamicColoring_groups_${coloringType}`);
  }

  async setPalette(paletteId: string, isLegacy: boolean) {
    await this.page.testSubj.click('lns_colorEditing_trigger');
    await expect(this.page.testSubj.locator('lns-palettePanelFlyout')).toBeVisible();

    const paletteModeToggle = this.page.testSubj.locator('lns_colorMappingOrLegacyPalette_switch');
    const targetValue = isLegacy ? 'true' : 'false';
    if ((await paletteModeToggle.getAttribute('aria-checked')) !== targetValue) {
      await paletteModeToggle.click();
    }

    if (isLegacy) {
      await this.page.testSubj.click('lns-palettePicker');
      await this.page.locator(`#${paletteId}`).click();
    } else {
      await this.page.testSubj.click('kbnColoring_ColorMapping_PalettePicker');
      await this.page.testSubj.click(`kbnColoring_ColorMapping_Palette-${paletteId}`);
    }

    await this.closePaletteEditor();
  }

  private async closePaletteEditor() {
    await this.page.testSubj.click('lns-indexPattern-SettingWithSiblingFlyoutBack');
    await expect(
      this.page.testSubj.locator('lns-indexPattern-SettingWithSiblingFlyoutBack')
    ).toBeHidden();
  }

  private async openDimensionEditor(dimension: string) {
    await this.page.testSubj.locator(dimension).click();
    await expect(this.closeDimensionEditorButton).toBeVisible();
  }

  private async closeDimensionEditor() {
    await this.closeDimensionEditorButton.click();
    await expect(this.closeDimensionEditorButton).toBeHidden();
  }

  private async selectOperation(operation: string, isPreviousIncompatible = false) {
    const operationSelector = isPreviousIncompatible
      ? `lns-indexPatternDimension-${operation} incompatible`
      : `lns-indexPatternDimension-${operation}`;
    const operationButton = this.page.testSubj.locator(operationSelector);
    await expect(operationButton).toBeVisible();
    await operationButton.scrollIntoViewIfNeeded();
    await operationButton.click();
    await expect(operationButton).toHaveAttribute('aria-pressed', 'true');
  }

  private async selectField(field: string) {
    await this.dimensionFieldComboBox.selectSingleOption(field, {
      optionTestSubj: `lns-fieldOption-${field}`,
    });
  }

  private async openChartSwitchPopover() {
    await this.chartSwitchPopover.click();
    await expect(this.chartSwitchList).toBeVisible();
  }

  getConvertToEsqlButton() {
    return this.page.getByRole('button', { name: 'Convert to ES|QL' });
  }

  getConvertToEsqModal() {
    return this.page.getByTestId('lnsConvertToEsqlModal');
  }

  getConvertToEsqModalConfirmButton() {
    return this.page.getByTestId('confirmModalConfirmButton');
  }
}
