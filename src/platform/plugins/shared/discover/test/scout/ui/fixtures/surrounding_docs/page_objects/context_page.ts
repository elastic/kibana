/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import rison from '@kbn/rison';
import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const DEFAULT_INITIAL_STATE = {
  columns: ['@message'],
};

export class ContextPage {
  public readonly predecessorsLoadMoreButton: Locator;
  public readonly successorsLoadMoreButton: Locator;
  public readonly predecessorsCountPicker: Locator;
  public readonly successorsCountPicker: Locator;
  public readonly docTable: Locator;

  constructor(private readonly page: ScoutPage) {
    this.predecessorsLoadMoreButton = page.testSubj.locator('predecessorsLoadMoreButton');
    this.successorsLoadMoreButton = page.testSubj.locator('successorsLoadMoreButton');
    this.predecessorsCountPicker = page.testSubj.locator('predecessorsCountPicker');
    this.successorsCountPicker = page.testSubj.locator('successorsCountPicker');
    this.docTable = page.testSubj.locator('discoverDocTable');
  }

  async navigateTo(dataViewId: string, anchorId: string, overrideInitialState = {}) {
    const initialState = rison.encode({
      ...DEFAULT_INITIAL_STATE,
      ...overrideInitialState,
    });

    await this.page.gotoApp('discover', {
      hash: `/context/${dataViewId}/${anchorId}?_a=${initialState}`,
    });
    await this.waitUntilContextLoadingHasFinished();
  }

  async waitUntilContextLoadingHasFinished() {
    await expect(this.predecessorsLoadMoreButton).toBeVisible({ timeout: 30_000 });
    await expect(this.predecessorsLoadMoreButton).toBeEnabled({ timeout: 30_000 });
    await expect(this.successorsLoadMoreButton).toBeVisible({ timeout: 30_000 });
    await expect(this.successorsLoadMoreButton).toBeEnabled({ timeout: 30_000 });
  }

  async clickPredecessorLoadMoreButton() {
    await this.predecessorsLoadMoreButton.click();
    await this.waitUntilContextLoadingHasFinished();
  }

  async clickSuccessorLoadMoreButton() {
    await this.successorsLoadMoreButton.click();
    await this.waitUntilContextLoadingHasFinished();
  }

  async getPredecessorCountPickerValue(): Promise<string> {
    return (await this.predecessorsCountPicker.getAttribute('value')) ?? '';
  }

  async getSuccessorCountPickerValue(): Promise<string> {
    return (await this.successorsCountPicker.getAttribute('value')) ?? '';
  }

  async setPredecessorCount(count: number) {
    await this.predecessorsCountPicker.click({ clickCount: 3 });
    await this.predecessorsCountPicker.fill(String(count));
    await this.predecessorsCountPicker.press('Enter');
    await this.waitUntilContextLoadingHasFinished();
  }

  async setSuccessorCount(count: number) {
    await this.successorsCountPicker.click({ clickCount: 3 });
    await this.successorsCountPicker.fill(String(count));
    await this.successorsCountPicker.press('Enter');
    await this.waitUntilContextLoadingHasFinished();
  }

  async getRowsText(includeAnchor = false): Promise<string[]> {
    const selector = includeAnchor
      ? '[data-test-subj="discoverDocTable"] [data-grid-row-index]'
      : '[data-test-subj="discoverDocTable"] [data-grid-row-index]:not([class*="anchorRow"])';
    const rows = this.page.locator(selector);
    await this.page.locator(`${selector} >> nth=0`).waitFor({ state: 'visible', timeout: 30_000 });
    return rows.allInnerTexts();
  }

  async getDocumentNumber(): Promise<number> {
    const attr = await this.docTable.getAttribute('data-document-number');
    return Number(attr);
  }

  async openRowActions(rowIndex: number) {
    const row = this.page.locator(`[data-grid-visible-row-index="${rowIndex}"]`);
    const expandButton = row.locator(
      '[data-test-subj="docTableExpandToggleColumn"], [data-test-subj="docTableExpandToggleColumnAnchor"]'
    );
    await expect(expandButton).toBeVisible();
    await expandButton.scrollIntoViewIfNeeded();
    await expandButton.click();
  }

  async openRowActionsForAnchor() {
    const expandButton = this.page.testSubj.locator('docTableExpandToggleColumnAnchor');
    await expect(expandButton).toBeVisible();
    await expandButton.scrollIntoViewIfNeeded();
    await expandButton.click();
  }

  async clickRowAction(actionIndex: number) {
    const flyout = this.page.testSubj.locator('docViewerFlyout');
    await expect(flyout).toBeVisible({ timeout: 10_000 });
    const actionButton = flyout.locator(
      `[data-test-subj="docTableRowAction"] >> nth=${actionIndex}`
    );
    await expect(actionButton).toBeVisible();
    await actionButton.click();
  }
}
