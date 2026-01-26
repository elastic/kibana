/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '..';
import { expect } from '..';

export class LensApp {
  constructor(private readonly page: ScoutPage) {}

  async waitForLensApp() {
    await this.page.testSubj.waitForSelector('lnsApp', { state: 'visible' });
  }

  async switchToVisualization(visType: string) {
    await this.openChartSwitchPopover();
    await this.page.testSubj.click(`lnsChartSwitchPopover_${visType}`);
    await this.applyChangesIfPresent();
  }

  async saveAndReturn() {
    await this.page.testSubj.click('lnsApp_saveAndReturnButton');
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
    const closeButton = this.page.testSubj.locator('lns-indexPattern-dimensionContainerClose');
    if (await closeButton.isVisible()) {
      return;
    }

    await expect(async () => {
      await this.page.testSubj.click(dimension);
      await closeButton.waitFor({ state: 'visible', timeout: 1000 });
    }).toPass({ timeout: 10_000 });
  }

  private async closeDimensionEditor() {
    await this.page.testSubj.click('lns-indexPattern-dimensionContainerClose');
    await this.page.testSubj.waitForSelector('lns-indexPattern-dimensionContainerClose', {
      state: 'hidden',
    });
  }

  private async selectOperation(operation: string, isPreviousIncompatible = false) {
    const operationSelector = isPreviousIncompatible
      ? `lns-indexPatternDimension-${operation} incompatible`
      : `lns-indexPatternDimension-${operation}`;
    const operationButton = this.page.testSubj.locator(operationSelector);
    await expect(async () => {
      if ((await operationButton.count()) === 0) {
        throw new Error(`Operation "${operation}" not available yet`);
      }
      await operationButton.scrollIntoViewIfNeeded();
      await operationButton.click();
      const ariaPressed = await operationButton.getAttribute('aria-pressed');
      if (ariaPressed !== 'true') {
        throw new Error(`aria-pressed="${ariaPressed}" for "${operation}"`);
      }
    }).toPass({ timeout: 10_000 });
  }

  private async selectField(field: string) {
    const fieldCombo = this.page.testSubj.locator('indexPattern-dimension-field');
    await fieldCombo.waitFor({ state: 'visible' });
    await fieldCombo.click();
    await this.page.testSubj.typeWithDelay(
      'indexPattern-dimension-field > comboBoxSearchInput',
      field
    );

    const optionByTestSubj = this.page.testSubj.locator(`lns-fieldOption-${field}`);
    if ((await optionByTestSubj.count()) > 0) {
      await optionByTestSubj.click();
      return;
    }

    await this.page.getByRole('option', { name: field, exact: true }).click();
  }

  private async openChartSwitchPopover() {
    if ((await this.page.testSubj.locator('lnsChartSwitchList').count()) > 0) {
      return;
    }
    await this.page.testSubj.click('lnsChartSwitchPopover');
    await this.page.testSubj.waitForSelector('lnsChartSwitchList', { state: 'visible' });
  }

  private async applyChangesIfPresent() {
    const applyButton = this.page.testSubj.locator('lnsApplyChanges__apply');
    if ((await applyButton.count()) > 0) {
      await applyButton.click();
    }
  }
}
