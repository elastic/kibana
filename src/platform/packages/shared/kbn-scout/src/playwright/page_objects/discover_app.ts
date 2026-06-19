/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Download } from 'playwright-core';
import type { Locator } from '../../..';
import type { ScoutPage } from '..';
import { expect } from '..';
import { resolveSelector } from '../utils/locator_helper';

export class DiscoverApp {
  constructor(private readonly page: ScoutPage) {}

  async goto() {
    await this.page.gotoApp('discover');
    await this.waitForDataViewSwitch();
  }

  private async getVisibleDataViewSwitch() {
    const discoverSwitch = this.page.testSubj.locator('discover-dataView-switch-link');
    const fallbackSwitch = this.page.testSubj.locator('dataView-switch-link');

    // There should be exactly one visible data view switch.
    // If both are visible (bug), fail explicitly instead of picking one
    await expect(discoverSwitch.or(fallbackSwitch)).toBeVisible();

    const discoverVisible = await discoverSwitch.isVisible();
    const fallbackVisible = await fallbackSwitch.isVisible();

    if (discoverVisible === fallbackVisible) {
      throw new Error(
        `Expected exactly one data view switch link to be visible, but discover=${discoverVisible} fallback=${fallbackVisible}`
      );
    }

    return discoverVisible ? discoverSwitch : fallbackSwitch;
  }

  private async waitForDataViewSwitch() {
    await this.getVisibleDataViewSwitch();
  }

  private async clickAppMenuItem(
    testId: string,
    { isInOverflowMenu }: { isInOverflowMenu?: boolean } = {}
  ) {
    const item = this.page.testSubj.locator(testId);
    if (!isInOverflowMenu && (await item.isVisible())) {
      await item.click();
      return;
    }
    const overflowButton = this.page.testSubj.locator('app-menu-overflow-button');
    const popover = this.page.testSubj.locator('app-menu-popover');

    // Dismiss any stale popovers
    if (await popover.isVisible()) {
      await overflowButton.click();
      await expect(popover).toBeHidden();
    }

    await expect(overflowButton).toBeVisible();
    await overflowButton.click();

    // If the click was consumed by closing a stale overlay, the popover won't be open.
    // Click the overflow button again if needed.
    const popoverOpened = await popover
      .waitFor({ state: 'visible', timeout: 2000 })
      .then(() => true)
      .catch(() => false);
    if (!popoverOpened) {
      await overflowButton.click();
    }

    await expect(popover).toBeVisible();
    const menuItem = this.page.testSubj.locator(testId);
    await expect(menuItem).toBeVisible();
    await menuItem.click();
  }

  async selectDataView(name: string) {
    const dataViewSwitch = await this.getVisibleDataViewSwitch();
    const currentValue = await dataViewSwitch.innerText();
    if (currentValue === name) {
      return;
    }
    await dataViewSwitch.click();
    await expect(this.page.testSubj.locator('indexPattern-switcher')).toBeVisible();
    await this.page.testSubj.typeWithDelay('indexPattern-switcher--input', name);
    const matchingDataViewLocator = this.page.testSubj
      .locator('indexPattern-switcher')
      .locator(`[title="${name}"]`);
    if (await matchingDataViewLocator.isVisible()) {
      await matchingDataViewLocator.click();
    } else {
      await this.page.testSubj.locator('explore-matching-indices-button').click();
    }
    await expect(this.page.testSubj.locator('indexPattern-switcher')).toBeHidden();
    await this.waitUntilFieldListHasCountOfFields();
  }

  getSelectedDataView(): Locator {
    return this.page.testSubj
      .locator('discover-dataView-switch-link')
      .or(this.page.testSubj.locator('dataView-switch-link'));
  }

  async clickNewSearch() {
    await this.page.testSubj.hover('discoverNewButton');
    await this.page.testSubj.click('discoverNewButton');
    await this.page.testSubj.hover('unifiedFieldListSidebar__toggle-collapse'); // cancel tooltips
    await this.page.testSubj.waitForSelector('loadingSpinner', { state: 'hidden' });
  }

  async saveSearch(name: string) {
    await this.page.testSubj.click('discoverSaveButton');
    await this.page.testSubj.fill('savedObjectTitle', name);
    await this.page.testSubj.click('confirmSaveSavedObjectButton');
    await this.page.testSubj.waitForSelector('savedObjectSaveModal', { state: 'hidden' });
  }

  /**
   * Save the currently rendered inline visualization (e.g. an ES|QL chart) to a
   * brand-new dashboard via the "Save visualization" flow in the unified
   * histogram. Returns once the save modal has closed.
   */
  async saveVisualizationToNewDashboard(visName: string) {
    await this.page.testSubj.click('unifiedHistogramSaveVisualization');
    await expect(this.page.testSubj.locator('savedObjectSaveModal')).toBeVisible();
    await this.page.testSubj.fill('savedObjectTitle', visName);
    // Clicking the EuiRadio wrapper does not toggle the underlying input
    // reliably; clicking the associated label does.
    await this.page.locator('label[for="new-dashboard-option"]').click();
    await this.page.testSubj.click('confirmSaveSavedObjectButton');
    await expect(this.page.testSubj.locator('savedObjectSaveModal')).toBeHidden();
  }

  async waitUntilFieldListHasCountOfFields() {
    await this.page.testSubj.waitForSelector('fieldListGroupedAvailableFields-countLoading', {
      state: 'hidden',
    });
  }

  /**
   * Assert that the "Selected fields" sidebar group contains exactly the
   * fields named in `expected` — no more, no less. Useful for verifying ES|QL
   * `KEEP` clauses or any explicit column-selection flow.
   */
  async expectSelectedSidebarFieldsToEqual(expected: readonly string[]) {
    await this.waitUntilFieldListHasCountOfFields();
    const selectedFields = this.page.testSubj.locator('fieldListGroupedSelectedFields');
    await expect(selectedFields).toBeVisible();

    const entries = selectedFields.getByTestId(/^dscFieldListPanelField-/);
    await expect(entries).toHaveCount(expected.length);

    for (const field of expected) {
      await expect(selectedFields.getByTestId(`dscFieldListPanelField-${field}`)).toBeVisible();
    }
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
    const searchInput = this.page.testSubj.locator('savedObjectFinderSearchInput');
    await searchInput.fill(`"${searchName.replace('-', ' ')}"`);

    // Click the saved search
    const savedSearchId = searchName.split(' ').join('-');
    await this.page.testSubj.click(`savedObjectTitle${savedSearchId}`);
    await this.waitUntilSearchingHasFinished();
  }

  async getHitCountInt(): Promise<number> {
    const hitCount = await this.page.testSubj.innerText('discoverQueryHits');
    return parseInt(hitCount.replace(/,/g, ''), 10);
  }

  async getChartTimespan(): Promise<string> {
    // Wait until the attribute no longer contains "Loading"
    const element = this.page.testSubj.locator('unifiedHistogramChart');
    await expect(element).not.toHaveAttribute('data-time-range', /Loading/);

    return (await element.getAttribute('data-time-range')) ?? '';
  }

  async clickHistogramBar() {
    const canvas = this.page.locator('[data-test-subj="unifiedHistogramChart"] canvas');
    // Click at the center of the canvas
    await canvas.click();
  }

  async waitUntilSearchingHasFinished() {
    await this.page.testSubj.waitForSelector('discoverDataGridUpdating', {
      state: 'hidden',
      timeout: 30000,
    });
  }

  // Waits for the document table to be fully rendered and stable
  async waitForDocTableRendered() {
    const table = this.page.testSubj.locator('discoverDocTable');
    await expect(table).toBeVisible();

    const minDurationMs = 2_000;
    const pollIntervalMs = 100;
    const totalTimeoutMs = 30_000;

    let stableSince: number | null = null;

    await expect
      .poll(
        async () => {
          const attr = await table.getAttribute('data-render-complete');
          const now = Date.now();

          if (attr === 'true') {
            if (!stableSince) {
              stableSince = now;
            }
            const elapsed = now - stableSince;
            return elapsed >= minDurationMs;
          } else {
            // Reset if it flips to anything other than 'true'
            stableSince = null;
            return false;
          }
        },
        {
          message: `data-render-complete did not stay 'true' for ${minDurationMs}ms`,
          timeout: totalTimeoutMs,
          intervals: [pollIntervalMs],
        }
      )
      .toBe(true);
  }

  async openDocumentDetails({ rowIndex }: { rowIndex: number }) {
    const expandButton = this.page.locator(
      `[data-grid-visible-row-index="${rowIndex}"] [data-test-subj="docTableExpandToggleColumn"]`
    );

    // Ensure button stable after grid render (catches row shifts)
    await expect(expandButton).toBeVisible();

    // Scroll to, hover, and click the expand button
    await expandButton.scrollIntoViewIfNeeded();
    await expandButton.hover();
    await expandButton.click({ delay: 50 });
  }

  async waitForDocViewerFlyoutOpen() {
    const docViewer = this.page.testSubj.locator('kbnDocViewer');
    await expect(docViewer).toBeVisible({ timeout: 30_000 });
  }

  async getDocTableIndex(index: number): Promise<string> {
    const rowIndex = index - 1; // Convert to 0-based index
    const row = this.page.locator(`[data-grid-row-index="${rowIndex}"]`);
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

  async expandTimeRangeAsSuggestedInNoResultsMessage() {
    const button = this.page.testSubj.locator('discoverNoResultsViewAllMatches');
    await button.click();
    await this.waitUntilSearchingHasFinished();
  }

  async revertUnsavedChanges() {
    await this.page.testSubj.hover('unsavedChangesBadge');
    await this.page.testSubj.click('unsavedChangesBadge');
    await this.page.testSubj.waitForSelector('unsavedChangesBadgeMenuPanel', { state: 'visible' });
    await this.page.testSubj.click('revertUnsavedChangesButton');
    await this.waitUntilSearchingHasFinished();
  }

  async clickFieldSort(field: string, sortOption: string) {
    const header = this.page.testSubj.locator(`dataGridHeaderCell-${field}`);
    await header.click();
    await this.page.testSubj.waitForSelector(`dataGridHeaderCellActionGroup-${field}`, {
      state: 'visible',
    });
    await this.page.locator(`button:has-text("${sortOption}")`).click();
  }

  async getDocHeader(): Promise<string> {
    const headers = await this.page
      .locator('[data-test-subj^="dataGridHeaderCell-"]')
      .allInnerTexts();
    return headers.join(',');
  }

  async showChart() {
    await this.page.testSubj.click('dscShowHistogramButton');
  }

  async hideChart() {
    await this.page.testSubj.click('dscHideHistogramButton');
  }

  async expectXYVisChartVisible() {
    await expect(this.page.testSubj.locator('xyVisChart')).toBeVisible();
  }

  async navigateToLensEditor() {
    await this.page.testSubj.click('unifiedHistogramEditVisualization');
  }

  async getTheColumnFromGrid(): Promise<string[]> {
    const columnLocators = await this.page.testSubj.locator('unifiedDataTableColumnTitle').all();
    return await Promise.all(columnLocators.map((locator) => locator.innerText()));
  }

  async writeSearchQuery(query: string) {
    await this.page.testSubj.fill('queryInput', query);
    await expect(this.page.testSubj.locator('queryInput')).toHaveValue(query);
    await this.page.testSubj.click('querySubmitButton');
    await this.waitUntilSearchingHasFinished();
  }

  async dragFieldToGrid(fieldName: string[]) {
    const gridLocator = this.page.testSubj.locator('euiDataGridBody');
    for (const field of fieldName) {
      // Fields can appear in both "Popular fields" and the full field list.
      await resolveSelector(this.page, `field-${field}`).dragTo(gridLocator);
    }
  }

  async getFirstViewLensButtonFromFieldStatistics(): Promise<Locator> {
    const viewButtons: Locator[] = await this.page.testSubj
      .locator('dataVisualizerActionViewInLensButton')
      .all();
    await expect(viewButtons[0]).toBeVisible();
    return viewButtons[0];
  }

  async exportAsCsv(): Promise<Download> {
    // Export may live in the top nav or the overflow menu depending on viewport / Discover layout.
    await this.clickAppMenuItem('exportTopNavButton');
    await this.page.testSubj.click('exportMenuItem-CSV');

    // 2. Trigger the report generation
    await this.page.testSubj.click('generateReportButton');

    // 3. Explicitly wait for the report to finish generating
    // Ensure the button is ready before we try to download
    const downloadBtn = this.page.testSubj.locator('downloadCompletedReportButton');
    await expect(downloadBtn).toBeEnabled({
      timeout: 30_000,
    });

    // 4. Coordinate the click and the event listener
    const [download] = await Promise.all([
      this.page.waitForEvent('download'), // Set listener
      downloadBtn.click(), // Perform action
    ]);

    return download;
  }

  async moveColumn(fieldName: string, direction: 'left' | 'right') {
    await this.page.testSubj.hover(`dataGridHeaderCell-${fieldName}`);
    await this.page.testSubj.click(`dataGridHeaderCellActionButton-${fieldName}`);
    await this.page.getByText(`Move ${direction}`).click();
  }
}
