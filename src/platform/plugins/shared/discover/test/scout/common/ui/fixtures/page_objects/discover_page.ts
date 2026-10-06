/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from '@kbn/scout';
import { DiscoverApp, resolveSelector } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { euiSelectors } from '@kbn/scout';

const SAVE_MODAL_TIMEOUT = 30_000;

/** Discover plugin page object — extends {@link DiscoverApp} with all Discover-only surface. */
export class DiscoverPage extends DiscoverApp {
  getRefreshDataButton(): Locator {
    return this.page.testSubj.locator('refreshDataButton');
  }

  getUninitializedPrompt(): Locator {
    return this.page.testSubj.locator('discoverUninitialized');
  }

  getUninitializedKeyboardShortcuts(): Locator {
    return this.page.testSubj.locator('discoverUninitializedKeyboardShortcuts');
  }

  async selectClassicMode() {
    const currentMode = await this.getCurrentQueryMode();

    if (currentMode !== 'classic') {
      await this.clickAppMenuItem('select-classic-mode-btn');
    }

    await this.waitUntilSearchingHasFinished();
    const queryMode = await this.getCurrentQueryMode();
    expect(queryMode).toBe('classic');
  }

  async writeAndSubmitKqlQuery(query: string) {
    const currentMode = await this.getCurrentQueryMode();

    if (currentMode !== 'classic') {
      throw new Error(
        `writeAndSubmitKqlQuery requires Discover to be in classic mode, but the current mode is "${currentMode}".`
      );
    }

    await this.queryBar.setQuery(query);
    await this.submitQueryAndWait();
  }

  /**
   * Opens a new Discover tab and runs the current query so the tab is initialized.
   * New tabs skip the initial fetch and ES|QL tabs start with an empty query, so
   * this recopies the previous ES|QL query before submit. Use
   * `unifiedTabs.createNewTab()` when the test needs the uninitialized empty state.
   */
  async createNewTabAndSearch() {
    const previousMode = await this.getCurrentQueryMode();
    const previousEsqlQuery =
      previousMode === 'esql' ? (await this.getEsqlQueryValue()).trim() : '';

    await this.unifiedTabs.createNewTab();

    if (previousEsqlQuery) {
      await this.esqlEditor.setQuery(previousEsqlQuery);
    }

    await this.submitQueryAndWait();
  }

  async getQuerySubmitButtonLabel(): Promise<string | null> {
    return this.page.testSubj.locator('querySubmitButton').getAttribute('aria-label');
  }

  async waitForDataGridRowWithRefresh(rowLocator: Locator, timeout = 30_000) {
    await this.submitQueryAndWait();
    await rowLocator.waitFor({ state: 'visible', timeout });
  }

  /** Opens the search-threshold rule flyout from Alerts (v1 button or v2 legacy option). */
  async openSearchThresholdRuleFlyout() {
    await this.clickAppMenuItem('discoverAlertsButton');
    const ruleOption = this.page.testSubj
      .locator('discoverLegacySearchThresholdRule')
      .or(this.page.testSubj.locator('discoverCreateAlertButton'));
    await expect(ruleOption).toBeVisible();
    await ruleOption.click();
    await expect(this.page.testSubj.locator('addRuleFlyoutTitle')).toBeVisible();
  }

  async clickNewSearch() {
    await this.clickAppMenuItem('discoverNewButton');
    await this.page.mouse.move(0, 0); // dismiss hover overlays
    await this.waitUntilTabIsLoaded();
  }

  /** Opens a linked panel's inline Dashboard edit session in the full Discover editor. */
  async openInlineEditorInDiscover() {
    await this.page.testSubj.click('discoverEmbeddableInlineEditEditInDiscoverLink');
    await this.waitUntilTabIsLoaded();
  }

  getCurrentQueryNameLocator(): Locator {
    // Project (chrome-next) shows the saved search name in the app header; classic chrome shows it
    // as the last breadcrumb. `.or()` keeps this layout-agnostic without a runtime gate.
    return this.page.testSubj
      .locator('appHeaderTitle')
      .or(this.page.testSubj.locator('breadcrumb last'));
  }

  async getCurrentQueryName(): Promise<string> {
    return await this.getCurrentQueryNameLocator().innerText();
  }

  private getStoreTimeWithSearchSwitch() {
    return this.page.testSubj.locator('storeTimeWithSearch');
  }

  // ── Save / share / export ─────────────────────────────────────────────────

  async openSaveSearchModal(name?: string) {
    await this.clickAppMenuItem('discoverSaveButton');
    await this.page.testSubj.locator('savedObjectSaveModal').waitFor({ state: 'visible' });
    if (name !== undefined) {
      await this.page.testSubj.fill('savedObjectTitle', name);
    }
  }

  async openSaveSearchAsModal() {
    await this.saveButtonSecondary.click();
    await this.interactiveSaveMenuItem.click();
    await this.saveModal.modal.waitFor({ state: 'visible' });
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

  /** Saves an embedded edit as a new library session and opens it in normal Discover mode. */
  async saveEditorSessionAsNew(name: string) {
    await this.page.testSubj.click('discoverSaveButton-secondary-button');
    const popover = this.page.testSubj.locator('discoverSaveButtonPopover');
    await popover.waitFor({ state: 'visible' });
    await this.page.testSubj.click('interactiveSaveMenuItem');
    await this.page.testSubj.locator('savedObjectSaveModal').waitFor({ state: 'visible' });
    await this.page.testSubj.fill('savedObjectTitle', name);
    await this.confirmSaveModal();
    await this.waitUntilTabIsLoaded();
  }

  async saveUnsavedChanges() {
    await this.clickAppMenuItem('discoverSaveButton');
    await this.page.testSubj.waitForSelector('confirmSaveSavedObjectButton', { state: 'visible' });
    await this.confirmSaveModal();
    await this.waitUntilSearchingHasFinished();
  }

  /**
   * Clicks "Save and return" in the top nav, available when Discover is opened as
   * the editor for a by-value dashboard panel. Transfers the panel state straight
   * back to the dashboard without opening a save modal.
   */
  async saveAndReturnToEditor() {
    await this.clickAppMenuItem('discoverSaveButton');
  }

  /**
   * Clicks "Cancel" in the top nav save split-button, available when Discover is
   * opened as the editor for a by-value dashboard panel. Discards the edits and
   * returns to the dashboard.
   */
  async cancelEditorChanges() {
    await this.page.testSubj.click('discoverSaveButton-secondary-button');
    await this.page.testSubj.locator('discoverCancelButton').click();
  }

  /**
   * Saves the current Discover table (including any ES|QL controls) as a by-value
   * panel on a brand-new dashboard, then navigates to that dashboard.
   */
  async saveTableToNewDashboard(title: string) {
    await this.page.testSubj.click('saveDiscoverTableToDashboardButton');
    await this.saveModal.modal.waitFor({ state: 'visible' });

    // Pick "new" before the title: filling the title re-renders the modal and would reset
    // the radio (confirm stays disabled on "existing" with no pick).
    await this.saveModal.selectNewDashboard();
    await this.saveModal.fillTitle(title);
    // Not `saveModal.confirm()`: it waits for the modal to close, which cannot happen yet.
    // Saving navigates away, and a session with unsaved changes raises the app-leave prompt
    // first, which keeps the save modal mounted until it is dismissed below.
    await this.page.testSubj.click('confirmSaveSavedObjectButton');

    // The leave prompt can also unmount on its own once navigation starts, so confirming it
    // is best effort.
    await this.page.testSubj
      .locator('appLeaveConfirmModal')
      .getByTestId('confirmModalConfirmButton')
      .click()
      .catch(() => {});

    await this.saveModal.modal.waitFor({ state: 'hidden', timeout: SAVE_MODAL_TIMEOUT });
    // The panel travels to the dashboard in session storage and is consumed on arrival, so
    // the method only returns once the dashboard is reached.
    await this.page.waitForURL(/\/app\/dashboards/);
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

  async exportAsCsv(options?: { timeout?: number }): Promise<import('playwright-core').Download> {
    const timeout = options?.timeout ?? 30_000;

    // Arm the response interceptor before clicking so we never miss it.
    // Use the caller's timeout — the page default (10s) is too short for 3 button clicks + HTTP.
    const generateResponsePromise = this.page.waitForResponse(
      (r) => r.url().includes('/internal/reporting/generate/') && r.request().method() === 'POST',
      { timeout }
    );

    // Export may live in the top nav or the overflow menu depending on viewport / Discover layout.
    // Settle the interceptor on click errors so it never produces an unhandled rejection.
    try {
      await this.clickAppMenuItem('exportTopNavButton');
      await this.page.testSubj.click('exportMenuItem-CSV');
      await this.page.testSubj.click('generateReportButton');
    } catch (clickErr) {
      generateResponsePromise.catch(() => {});
      throw clickErr;
    }

    const generateResponse = await generateResponsePromise;
    if (!generateResponse.ok()) {
      throw new Error(
        `CSV report generate request failed with status ${generateResponse.status()}`
      );
    }

    const downloadBtn = this.page.testSubj.locator('downloadCompletedReportButton');
    const reportFailure = this.page.locator('[data-test-errorText]');
    await downloadBtn.or(reportFailure).waitFor({ state: 'visible', timeout });

    if (await reportFailure.isVisible()) {
      const errorText = await reportFailure.getAttribute('data-test-errorText');
      throw new Error(`CSV report generation failed: ${errorText ?? 'Unknown error'}`);
    }

    const [download] = await Promise.all([this.page.waitForEvent('download'), downloadBtn.click()]);
    return download;
  }

  /**
   * Returns the trimmed display name of the currently selected data view.
   */
  async getSelectedDataViewName(): Promise<string> {
    return this.getDataViewSwitchName(await this.getVisibleDataViewSwitch());
  }

  // ── Layout helpers ────────────────────────────────────────────────────────

  async showTable() {
    await this.page.testSubj.click('dscShowTableButton');
    await this.waitUntilTabIsLoaded();
  }

  async hideTable() {
    await this.page.testSubj.click('dscHideTableButton');
    await this.waitUntilTabIsLoaded();
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

  async getHitCount(): Promise<string> {
    return this.getHitCountLocator().innerText();
  }

  getQueryInEsqlButton(): Locator {
    return this.page.testSubj.locator('queryInEsqlButton');
  }

  getQuerySubmitButton(): Locator {
    return this.page.testSubj.locator('querySubmitButton');
  }

  getQueryCancelButton(): Locator {
    return this.page.testSubj.locator('queryCancelButton');
  }

  getSearchResponseWarningsEmptyPrompt(): Locator {
    return this.page.testSubj.locator('searchResponseWarningsEmptyPrompt');
  }

  async getSearchFetchCount(): Promise<number> {
    const fetchCounter = this.page.locator('[data-fetch-counter]');
    await fetchCounter.waitFor({ state: 'attached' });
    return Number(await fetchCounter.getAttribute('data-fetch-counter'));
  }

  getErrorCalloutTitle(): Locator {
    return this.page.testSubj.locator('discoverErrorCalloutTitle');
  }

  getErrorCalloutMessage(): Locator {
    return this.page.testSubj.locator('discoverErrorCalloutMessage');
  }

  async getDocTableIndex(index: number): Promise<string> {
    const rowIndex = index - 1; // Convert to 0-based index
    const row = this.page.locator(`[data-grid-row-index="${rowIndex}"]`);
    return await row.innerText();
  }

  getSearchTermHighlights(): Locator {
    return this.page.testSubj.locator('docTable').locator('mark');
  }

  async getDocTableField(index: number): Promise<string> {
    const rowIndex = index - 1;
    await this.page.testSubj.click('dataGridFullScreenButton');
    const row = this.page.locator(`[data-grid-row-index="${rowIndex}"]`);
    const text = await row.innerText();
    await this.page.testSubj.click('dataGridFullScreenButton');
    return text.trim();
  }

  getDocHeaderLabels(): Locator {
    const headerCell = euiSelectors.dataGrid.HEADER_CELL_SELECTOR;
    return this.page.locator(
      `${headerCell}:not(${headerCell}--controlColumn) ${headerCell}__content`
    );
  }

  async getDocHeader(): Promise<string[]> {
    const headers = await this.getDocHeaderLabels().allInnerTexts();
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

  async moveColumn(fieldName: string, direction: 'left' | 'right') {
    await this.dataGrid.openColumnMenuByField(fieldName);
    await this.page.getByText(`Move ${direction}`).click();
  }

  async dragFieldToGrid(fieldName: string[]) {
    const gridLocator = this.page.testSubj.locator('euiDataGridBody');
    for (const field of fieldName) {
      // Fields can appear in both "Popular fields" and the full field list.
      await resolveSelector(this.page, `field-${field}`).dragTo(gridLocator);
    }
  }

  /**
   * Drags a sidebar field onto the grid using the keyboard, mirroring the FTR
   * `dragFieldWithKeyboardToTable` implementation.
   */
  async dragFieldToGridWithKeyboard(fieldName: string) {
    const keyboardHandler = this.page.locator(
      `[data-attr-field="${fieldName}"] [data-test-subj="domDragDrop-keyboardHandler"]`
    );
    await keyboardHandler.focus();
    await this.page.keyboard.press('Enter'); // enter DnD mode
    // domDroppable_overlay renders when DnD is active — use it as a sync point
    await this.page.testSubj.locator('domDroppable_overlay').waitFor({ state: 'visible' });
    await this.page.keyboard.press('ArrowRight'); // move to first drop target (the grid)
    await this.page.keyboard.press('Enter'); // drop
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

  /** Switches to the Field statistics view and waits for its content to mount. */
  async selectFieldStatisticsView() {
    await this.page.testSubj.click('dscViewModeToggleButton');
    await this.page.testSubj.locator('dscViewModeToggleSelectable').waitFor({ state: 'visible' });
    await this.page.testSubj.click('dscViewModeFieldStatsOption');
    // The Documents view stays mounted until the stats table renders, so callers
    // need this gate to avoid acting on the previous view.
    await this.page.testSubj.locator('dscFieldStatsEmbeddedContent').waitFor({ state: 'visible' });
  }

  async getFirstViewLensButtonFromFieldStatistics(): Promise<Locator> {
    const viewButtons: Locator[] = await this.page.testSubj
      .locator('dataVisualizerActionViewInLensButton')
      .all();
    await expect(viewButtons[0]).toBeVisible();
    return viewButtons[0];
  }

  async expandTimeRangeAsSuggestedInNoResultsMessage() {
    const button = this.page.testSubj.locator('discoverNoResultsViewAllMatches');
    await button.click();
    await this.waitUntilSearchingHasFinished();
  }

  async getTheColumnFromGrid(): Promise<string[]> {
    const columnLocators = await this.page.testSubj.locator('unifiedDataTableColumnTitle').all();
    return await Promise.all(columnLocators.map((locator) => locator.innerText()));
  }

  // ── Cascade layout ────────────────────────────────────────────────────────

  getCascadeLayout(): Locator {
    return this.page.testSubj.locator('data-cascade');
  }

  /**
   * Trigger for the "Group by" popover in the cascade layout toolbar. Despite
   * the `...Switch` test subject it is a popover button, not a toggle — use
   * {@link optOutOfCascadeLayout} to actually leave the cascade layout.
   */
  getCascadeLayoutSwitch(): Locator {
    return this.page.testSubj.locator('discoverEnableCascadeLayoutSwitch');
  }

  /**
   * Leaves the cascade ("grouped results") layout that Discover switches to for
   * `STATS ... BY` ES|QL queries, restoring the flat doc table. Expects the
   * cascade layout to be showing — it fails rather than silently doing nothing
   * if the layout is absent, so callers notice when the trigger stops applying.
   */
  async optOutOfCascadeLayout() {
    await this.getCascadeLayoutSwitch().click();
    await this.page.testSubj.locator('discoverGroupBySelectionList').waitFor({ state: 'visible' });
    await this.page.testSubj.click('discoverCascadeLayoutOptOutButton');
    await this.waitUntilTabIsLoaded();
    await this.getCascadeLayout().waitFor({ state: 'hidden' });
  }

  async isShowingCascadeLayout(): Promise<boolean> {
    const cascadeLayout = this.getCascadeLayout();
    const flatLayout = this.page.testSubj.locator('discoverDocTable');

    await cascadeLayout.or(flatLayout).waitFor({ state: 'visible' });
    return cascadeLayout.isVisible();
  }

  private getCascadeScrollContainer(): Locator {
    return this.page.testSubj.locator('dataCascadeScrollContainer');
  }

  /**
   * Returns the ids of the top-level ("root") cascade rows currently
   * scrolled into view within the cascade scroll container.
   */
  async getCascadeLayoutVisibleRowIds(): Promise<string[]> {
    return this.getCascadeScrollContainer().evaluate((container) => {
      const containerRect = container.getBoundingClientRect();
      const rows = container.querySelectorAll('[data-row-type="root"]');
      const visibleIds: string[] = [];
      for (const row of rows) {
        const rowRect = row.getBoundingClientRect();
        if (rowRect.top >= containerRect.bottom) break;
        if (rowRect.bottom > containerRect.top) {
          visibleIds.push(row.id || '');
        }
      }
      return visibleIds;
    });
  }

  /** Whether the given cascade row id is currently expanded. */
  async isCascadeLayoutRowExpanded(rowId: string): Promise<boolean> {
    return (await this.page.locator(`[id="${rowId}"]`).getAttribute('aria-expanded')) === 'true';
  }

  /**
   * Clicks the expand/collapse toggle for the cascade row with the given id,
   * without waiting for the resulting state change. Scoped to the row: while
   * scrolled, the sticky pinned group header renders a `createPortal`
   * duplicate of this same button elsewhere in the DOM (outside the row), so
   * an unscoped page-wide testSubj locator can match two elements.
   */
  async clickCascadeRowToggle(rowId: string): Promise<void> {
    await this.page
      .locator(`[id="${rowId}"]`)
      .locator(`[data-test-subj="toggle-row-${rowId}-button"]`)
      .click();
  }

  /**
   * Waits until the cascade row with the given id reports the given expansion
   * state, without waiting for the data of an expanded row to load.
   */
  async waitForCascadeLayoutRowExpanded(rowId: string, expanded: boolean): Promise<void> {
    await this.page
      .locator(`[id="${rowId}"]`)
      .and(this.page.locator(`[aria-expanded="${expanded}"]`))
      .waitFor({ state: 'attached' });
  }

  /**
   * Toggles (expands/collapses) the cascade row with the given id and waits
   * for the `aria-expanded` state to flip before returning. Waits for the doc
   * table to finish rendering after an expand, since that triggers a fetch.
   */
  async toggleCascadeLayoutRow(rowId: string): Promise<void> {
    const row = this.page.locator(`[id="${rowId}"]`);
    const wasExpanded = (await row.getAttribute('aria-expanded')) === 'true';

    await this.clickCascadeRowToggle(rowId);
    await this.waitForCascadeLayoutRowExpanded(rowId, !wasExpanded);

    if (!wasExpanded) {
      await this.dataGrid.waitForDocTableRendered();
    }
  }

  /**
   * Waits for the cascade layout's virtualizer to finish
   * measuring/correcting itself (e.g. restoring a scroll anchor after a tab
   * switch). The scroll container is hidden behind a loading spinner via
   * `visibility: hidden` until the virtualizer reports itself stable.
   */
  async waitForCascadeLayoutStable(): Promise<void> {
    await this.getCascadeScrollContainer().waitFor({ state: 'visible' });
  }

  /** Current `scrollTop` of the cascade layout's scroll container. */
  async getCascadeLayoutScrollTop(): Promise<number> {
    return this.getCascadeScrollContainer().evaluate((container) => container.scrollTop);
  }

  /** Scrolls the cascade layout's scroll container by `delta` pixels. */
  async scrollCascadeLayoutBy(delta: number): Promise<void> {
    await this.getCascadeScrollContainer().evaluate((container, scrollDelta) => {
      container.scrollTop += scrollDelta;
    }, delta);
  }

  /**
   * Waits for a just-performed scroll/expand of the cascade layout to be
   * persisted for state restoration. Persistence is debounced/throttled
   * internally with no externally observable signal, so callers must pause
   * here before triggering a remount (e.g. switching tabs) or the
   * just-performed change can be dropped and restored from stale state.
   */
  async waitForCascadeStatePersisted(): Promise<void> {
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(500);
  }
}
