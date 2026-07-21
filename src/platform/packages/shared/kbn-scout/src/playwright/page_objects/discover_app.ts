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
import { DataGrid } from './data_grid';
import { expect } from '..';
import { KibanaCodeEditorWrapper } from '../ui_components';
import { resolveSelector } from '../utils';

const DISCOVER_QUERY_MODE_KEY = 'discover.defaultQueryMode';

export type DiscoverQueryMode = 'esql' | 'classic';

export interface DiscoverGotoOptions {
  queryMode: DiscoverQueryMode;
}

export interface DataViewOptions {
  /** Data view title; `*` is appended automatically by the editor. */
  name: string;
  /** Create a temporary ("ad hoc") data view via "Explore" instead of saving. */
  adHoc?: boolean;
}

interface TimeoutOptions {
  timeout?: number;
}

const DEFAULT_SAVE_MODAL_TIMEOUT = 30_000;

export class DiscoverApp {
  public readonly codeEditor: KibanaCodeEditorWrapper;
  private readonly dataGrid: DataGrid;

  constructor(private readonly page: ScoutPage) {
    this.codeEditor = new KibanaCodeEditorWrapper(page);
    this.dataGrid = new DataGrid(page);
  }

  async goto(options: DiscoverGotoOptions) {
    await this.setQueryMode(options.queryMode);

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
    await this.page
      .locator(
        '[data-test-subj="discover-dataView-switch-link"], [data-test-subj="dataView-switch-link"]'
      )
      .waitFor({ state: 'visible' });

    const discoverVisible = await discoverSwitch.isVisible();
    const fallbackVisible = await fallbackSwitch.isVisible();

    if (discoverVisible === fallbackVisible) {
      throw new Error(
        `Expected exactly one data view switch link to be visible, but discover=${discoverVisible} fallback=${fallbackVisible}`
      );
    }

    return discoverVisible ? discoverSwitch : fallbackSwitch;
  }

  private async hideTabPreview() {
    await this.page.mouse.move(0, 0);
    await this.page.testSubj.locator('unifiedTabs_tabPreview_contentPanel').waitFor({
      state: 'hidden',
    });
  }

  private async openDataViewSwitcher() {
    const dataViewSwitch = await this.getVisibleDataViewSwitch();
    await this.hideTabPreview();
    await dataViewSwitch.click();
  }

  async selectDataView(name: string) {
    const dataViewSwitch = await this.getVisibleDataViewSwitch();
    const currentValue = await dataViewSwitch.innerText();
    if (currentValue === name) {
      return;
    }
    await this.hideTabPreview();
    await dataViewSwitch.click();
    const switcher = this.page.testSubj.locator('indexPattern-switcher');
    await switcher.waitFor({ state: 'visible' });
    await this.page.testSubj.typeWithDelay('indexPattern-switcher--input', name);
    const matchingDataViewLocator = switcher.locator(`[data-test-subj="dataView-${name}"]`);
    if (await matchingDataViewLocator.isVisible()) {
      await matchingDataViewLocator.click();
    } else {
      await this.page.testSubj.locator('explore-matching-indices-button').click();
    }
    await switcher.waitFor({ state: 'hidden' });
    await this.waitUntilFieldListHasCountOfFields();
  }

  getSelectedDataView(): Locator {
    return this.page.testSubj
      .locator('discover-dataView-switch-link')
      .or(this.page.testSubj.locator('dataView-switch-link'));
  }

  /**
   * Returns the trimmed display name of the currently selected data view.
   */
  async getSelectedDataViewName(): Promise<string> {
    return (await this.getSelectedDataView().innerText()).trim();
  }

  private async fillAndSubmitDataViewEditor({ name, adHoc = false }: DataViewOptions) {
    // Minimal inline interaction with the data view editor flyout. The full
    // `DataViewEditorPage` object lives in the `data_view_editor` plugin, but
    // `kbn-scout` is a base package and must not depend on a plugin, so the few
    // steps Discover needs are driven directly here.
    const flyout = this.page.testSubj.locator('indexPatternEditorFlyout');
    const form = this.page.testSubj.locator('indexPatternEditorForm');
    const titleInput = this.page.testSubj.locator('createIndexPatternTitleInput');
    const timestampField = this.page.testSubj.locator('timestampField');

    await flyout.waitFor({ state: 'visible' });

    // FTR passes the base name and relies on the editor auto-appending `*` as the
    // user types. Scout sets the title verbatim (`fill`), so append the wildcard
    // here to preserve that contract (`name`, `* will be added automatically`).
    await titleInput.fill(name.endsWith('*') ? name : `${name}*`);
    // wait for async title validation to settle before continuing.
    await form.and(this.page.locator('[data-validation-error="0"]')).waitFor({ state: 'visible' });

    // wait for timestamp options; default @timestamp applies.
    await timestampField
      .and(this.page.locator('[data-is-loading="0"]'))
      .waitFor({ state: 'visible', timeout: 30_000 });

    if (adHoc) {
      await this.page.testSubj.click('exploreIndexPatternButton');
    } else {
      await this.page.testSubj.click('saveIndexPatternButton');
    }
    await flyout.waitFor({ state: 'hidden' });

    await this.waitUntilTabIsLoaded();
  }

  /**
   * Creates a new data view from the Discover search bar data-view switcher
   * (classic mode only). The editor appends `*` to the title automatically.
   */
  async createDataViewFromSearchBar(options: DataViewOptions) {
    await this.openDataViewSwitcher();
    await this.page.testSubj.click('dataview-create-new');
    await this.fillAndSubmitDataViewEditor(options);
  }

  async createDataViewFromNoDataPrompt(options: DataViewOptions) {
    await this.page.testSubj.click('createDataViewButton');
    await this.fillAndSubmitDataViewEditor(options);
  }

  async getAvailableDataViewsFromSearchBar(): Promise<string[]> {
    await this.openDataViewSwitcher();
    const switcher = this.page.testSubj.locator('indexPattern-switcher');
    await switcher.waitFor({ state: 'visible' });

    const dataViews = await switcher
      .locator('.euiSelectableListItem[data-test-subj^="dataView-"]')
      .evaluateAll((items) =>
        items
          .map((item) => item.getAttribute('data-test-subj')?.slice('dataView-'.length))
          .filter((name): name is string => Boolean(name))
      );

    await this.page.keyboard.press('Escape');
    await switcher.waitFor({ state: 'hidden' });

    return dataViews;
  }

  async isCurrentDataViewAdHoc(): Promise<boolean> {
    const dataViewSwitch = await this.getVisibleDataViewSwitch();
    const dataViewTitle = await dataViewSwitch.getAttribute('title');

    if (!dataViewTitle) {
      throw new Error('Current data view switch is missing a title attribute');
    }

    await this.openDataViewSwitcher();
    const switcher = this.page.testSubj.locator('indexPattern-switcher');
    await switcher.waitFor({ state: 'visible' });
    const isAdHoc = await this.page.testSubj
      .locator(`dataViewItemTempBadge-${dataViewTitle}`)
      .isVisible();
    await this.page.keyboard.press('Escape');
    await switcher.waitFor({ state: 'hidden' });

    return isAdHoc;
  }

  async editCurrentDataViewName(
    name: string,
    { withConfirmation = false }: { withConfirmation?: boolean } = {}
  ) {
    await this.openDataViewSwitcher();
    await this.page.testSubj.click('indexPattern-manage-field');
    const flyout = this.page.testSubj.locator('indexPatternEditorFlyout');
    await flyout.waitFor({ state: 'visible' });
    const nameInput = this.page.testSubj.locator('createIndexPatternNameInput');
    await nameInput.fill(name);
    await expect(nameInput).toHaveValue(name);
    await this.page.testSubj.click('saveIndexPatternButton');
    if (withConfirmation) {
      const confirmButton = this.page.testSubj.locator('confirmModalConfirmButton');
      await confirmButton.waitFor({ state: 'visible' });
      await confirmButton.click();
    }
    await flyout.waitFor({ state: 'hidden' });
    await this.waitUntilTabIsLoaded();
  }

  async createRuntimeField(fieldName: string, script: string) {
    await this.openDataViewSwitcher();
    await this.page.testSubj.click('indexPattern-add-field');
    const fieldEditor = this.page.getByRole('dialog', { name: 'Create field' });
    await fieldEditor.waitFor({ state: 'visible' });

    await fieldEditor.getByRole('textbox', { name: 'Name field' }).fill(fieldName);
    await fieldEditor.getByRole('switch', { name: 'Set value' }).click();
    await fieldEditor
      .getByRole('textbox', { name: /Editor content/ })
      .waitFor({ state: 'visible' });
    await this.codeEditor.setCodeEditorValue(script);
    await fieldEditor.getByRole('button', { name: 'Save' }).click();
    await fieldEditor.waitFor({ state: 'hidden' });
    await this.waitUntilTabIsLoaded();
  }

  async renameRuntimeField(newFieldName: string) {
    const fieldEditor = this.page.getByRole('dialog', { name: /Edit .* field/ });
    await fieldEditor.waitFor({ state: 'visible' });

    await fieldEditor.getByRole('textbox', { name: 'Name field' }).fill(newFieldName);
    await this.page.testSubj.click('fieldSaveButton');
    await this.page.testSubj.fill('saveModalConfirmText', 'change');
    await this.page.testSubj.click('confirmModalConfirmButton');
    await fieldEditor.waitFor({ state: 'hidden' });
    await this.waitUntilTabIsLoaded();
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

  private async dismissHoverOverlays() {
    await this.page.mouse.move(0, 0);
  }

  async clickNewSearch({ isInOverflowMenu }: { isInOverflowMenu?: boolean } = {}) {
    await this.clickAppMenuItem('discoverNewButton', { isInOverflowMenu });
    await this.dismissHoverOverlays();
    await this.waitUntilTabIsLoaded();
  }

  private async confirmSaveModal(options?: TimeoutOptions) {
    const saveModal = this.page.testSubj.locator('savedObjectSaveModal');
    await this.page.testSubj.click('confirmSaveSavedObjectButton');
    await expect(saveModal).toBeHidden({
      timeout: options?.timeout ?? DEFAULT_SAVE_MODAL_TIMEOUT,
    });
  }

  async openSaveSearchModal(name?: string) {
    await this.page.testSubj.click('discoverSaveButton');
    await this.page.testSubj.locator('savedObjectSaveModal').waitFor({ state: 'visible' });
    if (name !== undefined) {
      await this.page.testSubj.fill('savedObjectTitle', name);
    }
  }

  private getStoreTimeWithSearchSwitch() {
    return this.page.testSubj.locator('storeTimeWithSearch');
  }

  async saveSearch(name: string, { storeTimeRange }: { storeTimeRange?: boolean } = {}) {
    await this.openSaveSearchModal(name);
    if (storeTimeRange !== undefined) {
      const switchControl = this.getStoreTimeWithSearchSwitch();
      await switchControl.waitFor({ state: 'visible' });
      const isChecked = (await switchControl.getAttribute('aria-checked')) === 'true';
      if (isChecked !== storeTimeRange) {
        await switchControl.click();
      }
    }
    await this.confirmSaveModal();
  }

  async saveSearchAsNew(name: string) {
    await this.page.testSubj.click('discoverSaveButton');
    await this.page.testSubj.fill('savedObjectTitle', name);
    const checkbox = this.page.testSubj.locator('saveAsNewCheckbox');
    if (!(await checkbox.isChecked())) {
      await checkbox.click();
    }
    await this.confirmSaveModal();
  }

  async saveUnsavedChanges() {
    await this.page.testSubj.click('discoverSaveButton');
    await this.page.testSubj.waitForSelector('confirmSaveSavedObjectButton', { state: 'visible' });
    await this.confirmSaveModal();
    await this.waitUntilSearchingHasFinished();
  }

  async getSharedUrl(): Promise<string> {
    await this.clickAppMenuItem('shareTopNavButton');

    const copyButton = this.page.testSubj.locator('copyShareUrlButton');

    await copyButton.waitFor({ state: 'visible' });
    await copyButton.click();

    const sharedUrl = await this.page.waitForFunction(() => {
      return document
        .querySelector('[data-test-subj="copyShareUrlButton"]')
        ?.getAttribute('data-share-url');
    });

    const url = await sharedUrl.jsonValue();
    if (typeof url !== 'string') {
      throw new Error('Share URL was not available on the copy button');
    }
    return url;
  }

  async closeShareModal() {
    const shareModal = this.page.testSubj.locator('shareContextModal');

    if (await shareModal.isVisible()) {
      await shareModal.getByLabel(/Close/).click();
      await shareModal.waitFor({ state: 'hidden' });
    }
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
    await this.confirmSaveModal();
  }

  async waitUntilFieldListHasCountOfFields() {
    await this.page.testSubj.waitForSelector('fieldListGroupedAvailableFields-countLoading', {
      state: 'hidden',
    });
  }

  /**
   * Returns the number of fields shown in the sidebar "Available fields" group.
   */
  async getSidebarAvailableFieldCount(): Promise<number> {
    await this.waitUntilFieldListHasCountOfFields();
    const count = await this.page.testSubj.innerText('fieldListGroupedAvailableFields-count');
    return Number(count);
  }

  /**
   * Filters the sidebar field list by the given search term.
   */
  async searchFieldInSidebar(name: string) {
    await this.page.testSubj.fill('fieldListFiltersFieldSearch', name);
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

  /**
   * Returns the rendered height (rounded to whole pixels) of the fixed histogram panel
   * Rounding avoids sub-pixel noise so callers can assert exact resize deltas.
   */
  async getHistogramHeight(): Promise<number> {
    const histogram = this.page.testSubj.locator('unifiedHistogramResizablePanelFixed');
    await histogram.waitFor();
    const box = await histogram.boundingBox();
    if (!box) {
      throw new Error('Could not read the histogram panel bounding box');
    }
    return Math.round(box.height);
  }

  /**
   * Drags the histogram resize handle vertically by `distance` pixels (positive
   * grows the histogram).
   * Neither Scout nor Playwright has a drag-by-offset helper (Scout's
   * `testSubj.dragTo` only drags element-to-element), so we drive the mouse
   * manually.
   */
  async resizeHistogramBy(distance: number) {
    const resizeButton = this.page.testSubj.locator('unifiedHistogramResizableButton');
    await resizeButton.waitFor();
    const box = await resizeButton.boundingBox();
    if (!box) {
      throw new Error('Could not read the histogram resize handle bounding box');
    }
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX, startY + distance, { steps: 10 });
    await this.page.mouse.up();
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

  async getHitCount(): Promise<string> {
    return this.page.testSubj.innerText('discoverQueryHits');
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

  // Waits for a Discover tab to finish loading.
  async waitUntilTabIsLoaded() {
    await this.waitForDiscoverPage();
    await this.waitUntilSearchingHasFinished();
  }

  async waitUntilSearchingHasFinished() {
    await this.dataGrid.waitForLoad();
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

  /**
   * Returns the label currently shown on the histogram breakdown selector button
   * (e.g. `"Breakdown by geo.src"` or `"No breakdown"`.
   */
  async getBreakdownFieldValue(): Promise<string> {
    return this.page.testSubj.innerText('unifiedHistogramBreakdownSelectorButton');
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

  unsavedChangesIndicator(): Locator {
    return this.page.testSubj.locator('split-button-notification-indicator');
  }

  public readonly controls = {
    getControlFrame: (controlId: string): Locator =>
      this.page.locator(`[data-test-subj='control-frame']:has([data-control-id='${controlId}'])`),
    getControlFrameSelectedValue: (controlId: string, value: string): Locator =>
      this.controls.getControlFrame(controlId).getByText(value),
  };

  async clickFieldSort(field: string, sortOption: string) {
    const header = this.dataGrid.getColumnHeader(field);
    await header.click();
    await this.page.testSubj.waitForSelector(`dataGridHeaderCellActionGroup-${field}`, {
      state: 'visible',
    });
    await this.page.locator(`button:has-text("${sortOption}")`).click();
  }

  async getDocHeader(): Promise<string[]> {
    const headers = await this.page
      .locator(
        '.euiDataGridHeaderCell:not(.euiDataGridHeaderCell--controlColumn) .euiDataGridHeaderCell__content'
      )
      .allInnerTexts();
    return headers.map((h) => h.trim());
  }

  /**
   * Returns structured row data from the data grid, excluding control columns.
   * Each inner array contains the visible text of each data cell in that row.
   * When `isAnchorRow` is true, only the highlighted anchor row (context view) is returned.
   */
  async getDataGridRows(options?: { isAnchorRow?: boolean }): Promise<string[][]> {
    const cellSelector = options?.isAnchorRow
      ? '.euiDataGridRowCell.unifiedDataTable__cell--highlight'
      : '.euiDataGridRowCell';

    await this.page.locator(`${cellSelector} >> nth=0`).waitFor({
      state: 'visible',
      timeout: 30_000,
    });

    return this.page.evaluate((sel: string) => {
      const cells = document.querySelectorAll(sel);
      const rows: string[][] = [];
      let rowIdx = -1;
      let prevVisibleRowIndex = -1;

      cells.forEach((cell) => {
        const visibleRowIndex = Number(cell.getAttribute('data-gridcell-visible-row-index'));
        if (prevVisibleRowIndex !== visibleRowIndex) {
          rowIdx++;
          rows[rowIdx] = [];
          prevVisibleRowIndex = visibleRowIndex;
        }
        if (!cell.classList.contains('euiDataGridRowCell--controlColumn')) {
          const content =
            cell.querySelector<HTMLElement>('.euiDataGridRowCell__content') ??
            (cell as HTMLElement);
          rows[rowIdx].push(content.innerText.trim());
        }
      });

      return rows;
    }, cellSelector);
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

  async openLensEditFlyout() {
    await this.page.testSubj.locator('unifiedHistogramEditFlyoutVisualization').click();
    await this.getLensEditFlyout().waitFor({ state: 'visible' });
  }

  getLensEditFlyout(): Locator {
    return this.page.testSubj.locator('lnsChartSwitchPopover');
  }

  async getTheColumnFromGrid(): Promise<string[]> {
    const columnLocators = await this.page.testSubj.locator('unifiedDataTableColumnTitle').all();
    return await Promise.all(columnLocators.map((locator) => locator.innerText()));
  }

  async writeAndSubmitKqlQuery(query: string) {
    const currentMode = await this.getCurrentQueryMode();

    if (currentMode !== 'classic') {
      throw new Error(
        `writeAndSubmitKqlQuery requires Discover to be in classic mode, but the current mode is "${currentMode}".`
      );
    }

    await this.page.testSubj.fill('queryInput', query);
    await expect(this.page.testSubj.locator('queryInput')).toHaveValue(query);
    await this.submitQuery();
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
    await this.dataGrid.openColumnMenuByField(fieldName);
    await this.page.getByText(`Move ${direction}`).click();
  }

  async selectTextBaseLang() {
    const currentMode = await this.getCurrentQueryMode();

    if (currentMode !== 'esql') {
      await this.page.testSubj.click('select-text-based-language-btn');
    }

    await this.waitUntilSearchingHasFinished();
    await this.codeEditor.waitCodeEditorReady('ESQLEditor');
  }

  async selectClassicMode() {
    const currentMode = await this.getCurrentQueryMode();

    if (currentMode !== 'classic') {
      await this.clickAppMenuItem('select-classic-mode-btn');
      await this.page.testSubj.waitForSelector('discover-esql-to-dataview-modal', {
        state: 'visible',
      });
      await this.page.testSubj.click('discover-esql-to-dataview-no-save-btn');
      await this.page.testSubj.waitForSelector('discover-esql-to-dataview-modal', {
        state: 'hidden',
      });
    }

    await this.waitUntilSearchingHasFinished();
    const queryMode = await this.getCurrentQueryMode();
    expect(queryMode).toBe('classic');
  }

  async writeAndSubmitEsqlQuery(query: string) {
    await this.selectTextBaseLang();
    await this.codeEditor.setCodeEditorValue(query);
    await this.submitQuery();
    await this.waitUntilSearchingHasFinished();
  }

  /**
   * Submits the current query (classic search bar or ES|QL editor) by clicking
   * the query submit button. Does not wait for results — pair with
   * `waitUntilSearchingHasFinished()` or `waitUntilTabIsLoaded()` as appropriate.
   */
  async submitQuery() {
    await this.hideTabPreview();
    await this.page.testSubj.click('querySubmitButton');
  }

  async getQuerySubmitButtonLabel(): Promise<string | null> {
    return this.page.testSubj.locator('querySubmitButton').getAttribute('aria-label');
  }

  async waitForDataGridRowWithRefresh(rowLocator: Locator, timeout = 30_000) {
    await this.submitQuery();
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

    const queryOption = this.esqlMenuPopover.getByRole('menuitem', {
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

  async openSidebar() {
    await this.page.testSubj.locator('dscShowSidebarButton').click();
    await this.waitUntilFieldListHasCountOfFields();
  }

  async closeSidebar() {
    await this.page.testSubj.locator('dscHideSidebarButton').click();
    await this.page.testSubj.locator('fieldList').waitFor({ state: 'hidden' });
  }

  async isSidebarPanelOpen(): Promise<boolean> {
    return this.page.testSubj
      .locator('fieldList')
      .waitFor({ state: 'visible', timeout: 1_000 })
      .then(() => true)
      .catch(() => false);
  }

  async getSidebarWidth(): Promise<number> {
    const sidebar = this.page.testSubj.locator('discover-sidebar');
    await sidebar.waitFor({ state: 'visible' });
    const box = await sidebar.boundingBox();
    if (!box) {
      throw new Error('Unable to measure Discover sidebar width');
    }
    return Math.round(box.width);
  }

  async resizeSidebarBy(distance: number) {
    const resizeButton = this.page.testSubj.locator('discoverLayoutResizableButton');
    await resizeButton.waitFor({ state: 'visible' });
    const box = await resizeButton.boundingBox();
    if (!box) {
      throw new Error('Unable to find Discover sidebar resize handle');
    }
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX + distance, startY, { steps: 10 });
    await this.page.mouse.up();
  }

  async isEsqlHistoryPanelOpen(): Promise<boolean> {
    return this.page.testSubj
      .locator('ESQLEditor-history-container')
      .waitFor({ state: 'visible', timeout: 1_000 })
      .then(() => true)
      .catch(() => false);
  }

  async toggleEsqlHistoryPanel() {
    const wasOpen = await this.isEsqlHistoryPanelOpen();
    await this.page.testSubj.locator('ESQLEditor-toggle-query-history-icon').click();
    await this.page.testSubj
      .locator('ESQLEditor-history-container')
      .waitFor({ state: wasOpen ? 'hidden' : 'visible' });
  }

  async getEsqlEditorHeight(): Promise<number> {
    const editor = this.page.testSubj.locator('ESQLEditor');
    await editor.waitFor({ state: 'visible' });
    const box = await editor.boundingBox();
    if (!box) {
      throw new Error('Unable to measure ES|QL editor height');
    }
    return Math.round(box.height);
  }

  async resizeEsqlEditorBy(distance: number) {
    const resizeButton = this.page.testSubj.locator('ESQLEditor-resize');
    await resizeButton.waitFor({ state: 'visible' });
    const box = await resizeButton.boundingBox();
    if (!box) {
      throw new Error('Unable to find ES|QL editor resize handle');
    }
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX, startY + distance, { steps: 10 });
    await this.page.mouse.up();
  }

  async addBreakdownFieldFromSidebar(
    field: string,
    section: 'selected' | 'available' = 'available'
  ) {
    const sidebarToggleButton = this.page.testSubj.locator('discover-sidebar-fields-button');
    if (await sidebarToggleButton.isVisible()) {
      await sidebarToggleButton.click();
    }

    await this.waitUntilFieldListHasCountOfFields();

    const sectionTestSubj =
      section === 'selected' ? 'fieldListGroupedSelectedFields' : 'fieldListGroupedAvailableFields';
    const fieldLocator = this.page.testSubj
      .locator(sectionTestSubj)
      .locator(`[data-test-subj="field-${field}"]`);
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

  /**
   * Persists the requested Discover query mode in localStorage on the next
   * page load. Useful to make tests resilient to the `discover.isEsqlDefault`
   * feature flag being toggled at the project level.
   *
   * Note: this is not idempotent. Each call registers an additional init
   * script via Playwright's `addInitScript`, and on subsequent page loads
   * every registered script runs in order, so the value written by the
   * last call wins. Avoid calling it multiple times in the same test
   * unless that stacking behavior is intentional.
   */
  public setQueryMode(mode: DiscoverQueryMode) {
    return this.page.addInitScript(
      ([_mode, _discoverQueryModeKey]) => {
        window.localStorage.setItem(_discoverQueryModeKey, JSON.stringify(_mode));
      },
      [mode, DISCOVER_QUERY_MODE_KEY]
    );
  }

  /**
   * Detects whether Discover is currently rendering ES|QL or classic
   * (KQL + data view) mode by racing the two mode-specific anchors:
   * the ES|QL editor and the classic KQL `queryInput`.
   */
  async getCurrentQueryMode(): Promise<DiscoverQueryMode> {
    const esqlEditor = this.page.testSubj.locator('ESQLEditor');
    const classicQueryInput = this.page.testSubj.locator('queryInput');

    // Wait until one of the two mode-specific anchors is rendered
    await expect(esqlEditor.or(classicQueryInput)).toBeVisible();

    // Return the mode that is currently visible
    return (await esqlEditor.isVisible()) ? 'esql' : 'classic';
  }

  async isShowingDocViewer(): Promise<boolean> {
    try {
      await this.page.testSubj
        .locator('kbnDocViewer')
        .waitFor({ state: 'visible', timeout: 30_000 });
      return true;
    } catch {
      return false;
    }
  }
}
