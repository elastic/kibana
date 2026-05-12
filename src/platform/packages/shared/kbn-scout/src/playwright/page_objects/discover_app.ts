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
import { KibanaCodeEditorWrapper } from '../ui_components';

const DISCOVER_QUERY_MODE_KEY = 'discover.defaultQueryMode';

export class DiscoverApp {
  public readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(private readonly page: ScoutPage) {
    this.codeEditor = new KibanaCodeEditorWrapper(page);
  }

  async goto() {
    await this.page.gotoApp('discover');
    await this.waitForDiscoverPage();
  }

  private async waitForDiscoverPage() {
    // Discover initialization in serverless CI environments regularly exceeds the default 10s,
    // likely due to additional plugin overhead and root profile resolution.
    await expect(this.page.testSubj.locator('dscPage')).toBeVisible({ timeout: 30_000 });
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

  async clickNewSearch({ isInOverflowMenu }: { isInOverflowMenu?: boolean } = {}) {
    await this.clickAppMenuItem('discoverNewButton', { isInOverflowMenu });
    await this.page.testSubj.hover('dscHideSidebarButton'); // cancel tooltips
    await this.waitForDiscoverPage();
    await this.page.testSubj.waitForSelector('loadingSpinner', { state: 'hidden' });
  }

  async saveSearch(name: string) {
    await this.page.testSubj.click('discoverSaveButton');
    await this.page.testSubj.fill('savedObjectTitle', name);
    await this.page.testSubj.click('confirmSaveSavedObjectButton');
    await this.page.testSubj.waitForSelector('savedObjectSaveModal', { state: 'hidden' });
  }

  async waitUntilFieldListHasCountOfFields() {
    await this.page.testSubj.waitForSelector('fieldListGroupedAvailableFields-countLoading', {
      state: 'hidden',
    });
  }

  async waitForHistogramRendered() {
    await this.page.testSubj.waitForSelector('unifiedHistogramRendered');
  }

  async getCurrentQueryName(): Promise<string> {
    const breadcrumb = this.page.testSubj.locator('breadcrumb last');
    return await breadcrumb.innerText();
  }

  async loadSavedSearch(searchName: string) {
    await this.clickAppMenuItem('discoverOpenButton');
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
    // Give the grid-updating indicator a brief window to appear. Without this,
    // `waitForSelector({ state: 'hidden' })` returns immediately when the
    // indicator hasn't yet mounted — callers would then observe pre-search
    // state (e.g. request-count assertions reading 0 before the search fires).
    try {
      await this.page.testSubj.waitForSelector('discoverDataGridUpdating', {
        state: 'visible',
        timeout: 2_000,
      });
    } catch {
      // Indicator never appeared — assume nothing was in flight.
    }
    await this.page.testSubj.waitForSelector('discoverDataGridUpdating', {
      state: 'hidden',
      timeout: 30_000,
    });
  }

  // Waits for the document table to be fully rendered and stable
  async waitForDocTableRendered() {
    const table = this.page.testSubj.locator('discoverDocTable');
    const minDurationMs = 2_000;
    const pollIntervalMs = 100;
    const totalTimeoutMs = 30_000;

    await expect(table).toBeVisible({ timeout: totalTimeoutMs });

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

  async openAndWaitForDocViewerFlyout({ rowIndex }: { rowIndex: number }) {
    await this.openDocumentDetails({ rowIndex });
    await this.waitForDocViewerFlyoutOpen();
  }

  /**
   * Close the Discover document-viewer flyout and wait for it to disappear.
   */
  async closeDocViewerFlyout() {
    await this.page.testSubj.click('euiFlyoutCloseButton');
    await this.page.testSubj.waitForSelector('kbnDocViewer', { state: 'hidden' });
  }

  /**
   * Hover the given data-grid cell and click its "expand" action, opening the
   * cell-value popover (which embeds a Monaco editor with the row JSON).
   *
   * @param rowIndex - 0-based visible row index.
   * @param columnId - EUI data-grid column id (e.g. `_source`, `@timestamp`).
   */
  async expandGridCell({ rowIndex, columnId }: { rowIndex: number; columnId: string }) {
    const cell = this.page.locator(
      `[data-grid-visible-row-index="${rowIndex}"] [data-gridcell-column-id="${columnId}"]`
    );
    await cell.hover();
    await cell.locator('[data-test-subj="euiDataGridCellExpandButton"]').click();
    await this.page.testSubj.waitForSelector('euiDataGridExpansionPopover', { state: 'visible' });
  }

  /**
   * Inside an open document-viewer flyout, toggle the grid column for `fieldName`
   * from the field-table tab. Calling this twice on the same field toggles it off.
   */
  async toggleColumnInDocViewer(fieldName: string) {
    const flyout = this.page.testSubj.locator('docViewerFlyout');
    await expect(async () => {
      const nameElement = flyout.locator(`[data-test-subj="tableDocViewRow-${fieldName}-name"]`);
      await nameElement.evaluate((el) => {
        el.scrollIntoView({ block: 'center', inline: 'nearest' });
      });
      await nameElement.hover();
      const toggle = flyout.locator(`[data-test-subj="toggleColumnButton-${fieldName}"]`);
      await toggle.waitFor({ state: 'visible' });
      await toggle.scrollIntoViewIfNeeded();
      await toggle.click();
    }).toPass({ timeout: 15_000 });
  }

  /**
   * Read JSON from the active Monaco source editor (cell expansion popover, or doc
   * flyout after the JSON tab is selected). Retries until the model is non-empty —
   * the wrapper can return `''` before the document attaches.
   */
  async readMonacoJson(): Promise<{ _id: string } & Record<string, unknown>> {
    let parsed: { _id: string } & Record<string, unknown> = { _id: '' };
    await expect(async () => {
      const raw = await this.codeEditor.getCodeEditorValue();
      if (!raw) {
        throw new Error('Monaco editor has not rendered a value yet');
      }
      parsed = JSON.parse(raw);
    }).toPass({ timeout: 30_000 });
    return parsed;
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

  /**
   * Pick a histogram chart interval (e.g. `"Day"`).
   */
  async setChartInterval(intervalTitle: string) {
    await this.page.testSubj.click('unifiedHistogramTimeIntervalSelectorButton');
    await this.page.testSubj.waitForSelector('unifiedHistogramTimeIntervalSelectorSelectable', {
      state: 'visible',
    });
    await this.page
      .locator(
        `[data-test-subj="unifiedHistogramTimeIntervalSelectorSelectable"] .euiSelectableListItem[title="${intervalTitle}"]`
      )
      .click();
    await this.page.testSubj.waitForSelector('unifiedHistogramTimeIntervalSelectorSelectable', {
      state: 'hidden',
    });
  }

  /**
   * Click the histogram breakdown selector and pick `field` (or `"No breakdown"`).
   */
  async chooseBreakdownField(field: string) {
    await this.page.testSubj.click('unifiedHistogramBreakdownSelectorButton');
    await this.page.testSubj.waitForSelector('unifiedHistogramBreakdownSelectorSelectable', {
      state: 'visible',
    });
    await this.page.testSubj.fill('unifiedHistogramBreakdownSelectorSelectorSearch', field);
    await this.page
      .locator(
        `[data-test-subj="unifiedHistogramBreakdownSelectorSelectable"] .euiSelectableListItem[value="${field}"]`
      )
      .click();
    await this.page.testSubj.waitForSelector('unifiedHistogramBreakdownSelectorSelectable', {
      state: 'hidden',
    });
  }

  async expandTimeRangeAsSuggestedInNoResultsMessage() {
    const button = this.page.testSubj.locator('discoverNoResultsViewAllMatches');
    await button.click();
    await this.waitUntilSearchingHasFinished();
  }

  async revertUnsavedChanges() {
    // Click the secondary button on the split save button
    await this.page.testSubj.click('discoverSaveButton-secondary-button');

    // Wait for popover and revert
    const revertButton = this.page.testSubj.locator('revertUnsavedChangesButton');
    await expect(revertButton).toBeVisible();
    await revertButton.click();

    await this.waitUntilSearchingHasFinished();
  }

  getColumnHeader(name: string): Locator {
    return this.page.testSubj.locator(`dataGridHeaderCell-${name}`);
  }

  public readonly controls = {
    getControlFrame: (controlId: string): Locator =>
      this.page.locator(`[data-test-subj='control-frame']:has([data-control-id='${controlId}'])`),
    getControlFrameSelectedValue: (controlId: string, value: string): Locator =>
      this.controls.getControlFrame(controlId).getByText(value),
  };

  async clickFieldSort(field: string, sortOption: string) {
    const header = this.getColumnHeader(field);
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

  async navigateToLensEditor() {
    await this.page.testSubj.click('unifiedHistogramEditVisualization');
  }

  async getTheColumnFromGrid(): Promise<string[]> {
    const columnLocators = await this.page.testSubj.locator('unifiedDataTableColumnTitle').all();
    return await Promise.all(columnLocators.map((locator) => locator.innerText()));
  }

  async writeAndSubmitKqlQuery(query: string) {
    await this.page.testSubj.fill('queryInput', query);
    await expect(this.page.testSubj.locator('queryInput')).toHaveValue(query);
    await this.page.testSubj.click('querySubmitButton');
    await this.waitUntilSearchingHasFinished();
  }

  async dragFieldToGrid(fieldName: string[]) {
    for (const field of fieldName) {
      await this.page.testSubj.dragTo(`field-${field}`, 'euiDataGridBody');
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
    // 1. Navigate to the export menu
    await this.page.testSubj.click('exportTopNavButton');
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

  async selectTextBaseLang() {
    if (await this.page.testSubj.isEnabled('select-text-based-language-btn')) {
      await this.page.testSubj.click('select-text-based-language-btn');
      await this.waitUntilSearchingHasFinished();
      await this.codeEditor.waitCodeEditorReady('ESQLEditor');
    }
  }

  async writeAndSubmitEsqlQuery(query: string) {
    await this.selectTextBaseLang();
    await this.codeEditor.setCodeEditorValue(query);
    await this.page.testSubj.click('querySubmitButton');
    await this.waitUntilSearchingHasFinished();
  }

  async navigateToTabByName(name: string) {
    const tabsBar = this.page.testSubj.locator('unifiedTabs_tabsBar');
    const tab = tabsBar.getByRole('tab', { name });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  }

  async waitForDataGridRowWithRefresh(rowLocator: Locator, timeout = 30_000) {
    await this.page.testSubj.click('querySubmitButton');
    await this.waitUntilSearchingHasFinished();
    await rowLocator.waitFor({ state: 'visible', timeout });
  }

  public get esqlMenuPopover(): Locator {
    return this.page.testSubj.locator('esql-menu-popover');
  }

  async openRecommendedQueriesPanel() {
    const menuPopover = this.esqlMenuPopover;
    if (!(await menuPopover.isVisible())) {
      await this.page.testSubj.click('esql-help-popover-button');
    }

    await menuPopover.waitFor({ state: 'visible' });

    const recommendedQueriesButton = this.page.testSubj.locator('esql-recommended-queries');
    await expect(recommendedQueriesButton).toBeVisible();
    await recommendedQueriesButton.click();
    await this.page.testSubj.locator('contextMenuPanelTitleButton').waitFor({ state: 'visible' });
  }

  async runRecommendedEsqlQuery(queryLabel: string) {
    await this.openRecommendedQueriesPanel();

    const queryOption = this.esqlMenuPopover.getByRole('button', {
      exact: true,
      name: queryLabel,
    });

    await expect(queryOption).toBeVisible();
    await queryOption.click();
    await this.waitUntilSearchingHasFinished();
  }

  async getEsqlQueryValue(nthIndex: number = 0): Promise<string> {
    return this.codeEditor.getCodeEditorValue(nthIndex);
  }

  async addBreakdownFieldFromSidebar(field: string) {
    const sidebarToggleButton = this.page.testSubj.locator('discover-sidebar-fields-button');
    if (await sidebarToggleButton.isVisible()) {
      await sidebarToggleButton.click();
    }

    await this.waitUntilFieldListHasCountOfFields();

    const fieldLocator = this.page.testSubj.locator(`field-${field}`);
    await fieldLocator.hover();
    await fieldLocator.click();
    await this.waitUntilFieldPopoverIsLoaded();

    await this.page.testSubj.locator(`fieldPopoverHeader_addBreakdownField-${field}`).click();
    await this.waitUntilSearchingHasFinished();
  }

  private async waitUntilFieldPopoverIsLoaded() {
    await this.page.locator('[data-popover-open="true"]').waitFor({ state: 'visible' });
    await expect(this.page.locator('[data-test-subj*="-statsLoading"]')).toBeHidden();
  }

  /**
   * Scrolls through the virtualized doc table grid to assert that the given
   * text exists somewhere in the rendered rows. Necessary because virtual
   * scrolling only keeps a subset of rows in the DOM at any time.
   */
  async expectDocTableToContainText(text: string) {
    // 200px per step × 50 steps = 10 000px of total scroll coverage,
    // enough for grids with hundreds of rows at default row height (~34px).
    const SCROLL_STEP_PX = 200;
    const MAX_SCROLL_STEPS = 50;
    // Per-position timeout: long enough for Playwright to retry through
    // transient re-renders, short enough to not stall at positions where
    // the text genuinely isn't in the DOM.
    const PER_POSITION_TIMEOUT_MS = 500;

    await this.waitUntilSearchingHasFinished();
    const docTable = this.page.testSubj.locator('discoverDocTable');
    await expect(docTable).toBeVisible();

    const grid = docTable.locator('.euiDataGrid__virtualized');
    await grid.evaluate((el) => el.scrollTo(0, 0));

    for (let i = 0; i < MAX_SCROLL_STEPS; i++) {
      try {
        await expect(docTable).toContainText(text, { timeout: PER_POSITION_TIMEOUT_MS });
        return;
      } catch {
        // Text not found at this scroll position, continue scrolling
      }

      const atBottom = await grid.evaluate((el, step) => {
        if (el.scrollTop + el.clientHeight >= el.scrollHeight) return true;
        el.scrollBy(0, step);
        return false;
      }, SCROLL_STEP_PX);
      if (atBottom) break;
    }

    await expect(docTable).toContainText(text);
  }

  public setQueryMode(mode: 'esql' | 'classic') {
    return this.page.addInitScript(
      ([_mode, _discoverQueryModeKey]) => {
        window.localStorage.setItem(_discoverQueryModeKey, JSON.stringify(_mode));
      },
      [mode, DISCOVER_QUERY_MODE_KEY]
    );
  }
}
