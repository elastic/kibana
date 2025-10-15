/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '..';

export class DiscoverApp {
  constructor(private readonly page: ScoutPage) {}

  async goto() {
    await this.page.gotoApp('discover');
  }

  async selectDataView(name: string) {
    const currentValue = await this.page.testSubj.innerText('*dataView-switch-link');
    if (currentValue === name) {
      return;
    }
    await this.page.testSubj.click('*dataView-switch-link');
    await this.page.testSubj.waitForSelector('indexPattern-switcher');
    await this.page.testSubj.typeWithDelay('indexPattern-switcher--input', name);
    await this.page.testSubj.locator('indexPattern-switcher').locator(`[title="${name}"]`).click();
    await this.page.testSubj.waitForSelector('indexPattern-switcher', { state: 'hidden' });
    await this.page.waitForLoadingIndicatorHidden();
  }

  async clickNewSearch() {
    await this.page.testSubj.hover('discoverNewButton');
    await this.page.testSubj.click('discoverNewButton');
    await this.page.testSubj.hover('unifiedFieldListSidebar__toggle-collapse'); // cancel tooltips
    await this.page.waitForLoadingIndicatorHidden();
  }

  async saveSearch(name: string) {
    await this.page.testSubj.click('discoverSaveButton');
    await this.page.testSubj.fill('savedObjectTitle', name);
    await this.page.testSubj.click('confirmSaveSavedObjectButton');
    await this.page.testSubj.waitForSelector('savedObjectSaveModal', { state: 'hidden' });
    await this.page.waitForLoadingIndicatorHidden();
  }

  async waitForHistogramRendered() {
    await this.page.testSubj.waitForSelector('unifiedHistogramRendered');
  }

  async getCurrentQueryName(): Promise<string> {
    const breadcrumb = this.page.testSubj.locator('breadcrumb last');
    return await breadcrumb.innerText();
  }

  async loadSavedSearch(searchName: string) {
    await this.page.testSubj.click('discoverOpenButton');
    await this.page.testSubj.waitForSelector('loadSearchForm', { state: 'visible' });

    // Filter for the search
    const searchInput = this.page.locator('[data-test-subj="savedObjectFinderSearchInput"]');
    await searchInput.fill(`"${searchName.replace('-', ' ')}"`);

    // Click the saved search
    const savedSearchId = searchName.split(' ').join('-');
    await this.page.testSubj.click(`savedObjectTitle${savedSearchId}`);
    await this.page.waitForLoadingIndicatorHidden();
  }

  async getHitCount(): Promise<string> {
    await this.page.waitForLoadingIndicatorHidden();
    return await this.page.testSubj.innerText('discoverQueryHits');
  }

  async getHitCountInt(): Promise<number> {
    const hitCount = await this.getHitCount();
    return parseInt(hitCount.replace(/,/g, ''), 10);
  }

  async getChartTimespan(): Promise<string> {
    return (
      (await this.page.testSubj.getAttribute('unifiedHistogramChart', 'data-time-range')) || ''
    );
  }

  async clickHistogramBar() {
    const canvas = this.page.locator('[data-test-subj="unifiedHistogramChart"] canvas');
    await canvas.waitFor({ state: 'visible', timeout: 5000 });
    // Click at the center of the canvas
    await canvas.click();
  }

  async waitUntilSearchingHasFinished() {
    await this.page.testSubj.waitForSelector('loadingSpinner', {
      state: 'hidden',
      timeout: 30000,
    });
  }

  async getDocTableIndex(index: number): Promise<string> {
    const rowIndex = index - 1; // Convert to 0-based index
    const row = this.page.locator(`[data-grid-row-index="${rowIndex}"]`);
    await row.waitFor({ state: 'visible' });
    return await row.innerText();
  }

  async getDocTableField(index: number): Promise<string> {
    const rowIndex = index - 1;
    await this.page.testSubj.click('dataGridFullScreenButton');
    const row = this.page.locator(`[data-grid-row-index="${rowIndex}"]`);
    const text = await row.innerText();
    await this.page.testSubj.click('dataGridFullScreenButton');
    return text.trim();
  }

  async getChartInterval(): Promise<string> {
    const button = this.page.testSubj.locator('unifiedHistogramTimeIntervalSelectorButton');
    return (await button.getAttribute('data-selected-value')) || '';
  }

  async hasNoResults(): Promise<boolean> {
    return await this.page.testSubj.isVisible('discoverNoResults');
  }

  async hasNoResultsTimepicker(): Promise<boolean> {
    return await this.page.testSubj.isVisible('discoverNoResultsTimefilter');
  }

  async expandTimeRangeAsSuggestedInNoResultsMessage() {
    const button = this.page.testSubj.locator('discoverNoResultsViewAllMatches');
    await button.waitFor({ state: 'visible' });
    await button.click();
    await this.waitUntilSearchingHasFinished();
    await this.page.waitForLoadingIndicatorHidden();
  }

  async revertUnsavedChanges() {
    await this.page.testSubj.hover('unsavedChangesBadge');
    await this.page.testSubj.click('unsavedChangesBadge');
    await this.page.testSubj.waitForSelector('unsavedChangesBadgeMenuPanel', { state: 'visible' });
    await this.page.testSubj.click('revertUnsavedChangesButton');
    await this.page.waitForLoadingIndicatorHidden();
    await this.waitUntilSearchingHasFinished();
  }

  async clickFieldSort(field: string, sortOption: string) {
    const header = this.page.locator(`[data-test-subj="dataGridHeaderCell-${field}"]`);
    await header.click();
    await this.page.locator(`button:has-text("${sortOption}")`).click();
  }

  async getDocHeader(): Promise<string> {
    const headers = await this.page
      .locator('[data-test-subj^="dataGridHeaderCell-"]')
      .allInnerTexts();
    return headers.join(',');
  }

  async getSharedItemTitleAndDescription(): Promise<{ title: string; description: string }> {
    const cssSelector = '[data-shared-item][data-title][data-description]';
    const element = this.page.locator(cssSelector);
    await element.waitFor({ state: 'visible' });

    const title = (await element.getAttribute('data-title')) || '';
    const description = (await element.getAttribute('data-description')) || '';

    return { title, description };
  }
}
