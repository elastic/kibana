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

  async saveAndReturn() {
    await this.saveAndReturnButton.click();
  }

  async configureXYDimensions(options?: {
    y?: { operation: string; field?: string };
    x?: { operation: string; field?: string };
    split?: { operation: string; field?: string };
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
    });
  }

  async configureDimension(opts: { dimension: string; operation: string; field?: string }) {
    await this.openDimensionEditor(opts.dimension);
    await this.selectOperation(opts.operation);
    if (opts.field) {
      await this.selectField(opts.field);
    }
    await this.closeDimensionEditor();
  }

  private async openDimensionEditor(dimension: string) {
    if (await this.closeDimensionEditorButton.isVisible()) {
      return;
    }

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
    if (await this.chartSwitchList.isVisible()) {
      return;
    }
    await this.chartSwitchPopover.click();
    await expect(this.chartSwitchList).toBeVisible();
  }
}
