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

export type DiscoverQueryMode = 'esql' | 'classic';

export interface DiscoverGotoOptions {
  queryMode?: DiscoverQueryMode;
}

/**
 * Test-subject prefixes used by the Unified Tabs component.
 */
const UNIFIED_TABS_TEST_SUBJ = {
  selectTabBtnPrefix: 'unifiedTabs_selectTabBtn_',
  tabMenuBtnPrefix: 'unifiedTabs_tabMenuBtn_',
  newTabBtn: 'unifiedTabs_tabsBar_newTabBtn',
  tabsBar: 'unifiedTabs_tabsBar',
  duplicateMenuItem: 'unifiedTabs_tabMenuItem_duplicate',
  inspectMenuItem: 'unifiedTabs_tabMenuItem_inspect',
} as const;

export class DiscoverApp {
  public readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(private readonly page: ScoutPage) {
    this.codeEditor = new KibanaCodeEditorWrapper(page);
  }

  async goto(options: DiscoverGotoOptions = {}) {
    if (options.queryMode) await this.setQueryMode(options.queryMode);

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

  async saveSearch(name: string, saveAsNew?: boolean) {
    await this.page.testSubj.click('discoverSaveButton');
    await this.page.testSubj.fill('savedObjectTitle', name);
    if (saveAsNew !== undefined) {
      // The "Save as new" switch only appears when editing an already-
      // saved search; setting it changes whether the save creates a copy or
      // overwrites the original. Read aria-checked rather than the EUI
      // class so this stays decoupled from EUI internals.
      const toggle = this.page.testSubj.locator('saveAsNewCheckbox');
      const desired = saveAsNew ? 'true' : 'false';
      if ((await toggle.getAttribute('aria-checked')) !== desired) {
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-checked', desired);
      }
    }
    await this.page.testSubj.click('confirmSaveSavedObjectButton');
    await this.page.testSubj.waitForSelector('savedObjectSaveModal', { state: 'hidden' });
    await this.waitUntilSearchingHasFinished();
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

  /**
   * Locator for the formatted Discover hit count (e.g. `"14,004"`). Prefer
   * `expect(discover.hitCountLocator()).toHaveText(expected, { timeout: 30_000 })`
   * over polling `getHitCount()` — the hit count can render the *previous*
   * value past Playwright's default 5s after a query swap, since
   * `waitUntilSearchingHasFinished` doesn't sync the chart suggestion or the
   * hit-count update path.
   */
  hitCountLocator(): Locator {
    return this.page.testSubj.locator('discoverQueryHits');
  }

  /**
   * Read the formatted Discover hit count as a string (e.g. `"14,004"`).
   * For assertions, prefer `expect(hitCountLocator()).toHaveText(...)` to
   * avoid stale-value races.
   */
  async getHitCount(): Promise<string> {
    return await this.page.testSubj.innerText('discoverQueryHits');
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
   * Click a row-action link inside an open document-viewer flyout. Action ids
   * come from `use_flyout_actions.tsx` in the discover plugin: each action
   * carries a `docTableRowAction docTableRowAction-<id>` test-subj pair, so the
   * generic `docTableRowAction` subj still works for legacy callers (e.g. FTR
   * `dataGrid.getRowActions()`) while specs target a specific action by id.
   */
  async clickRowActionInFlyout(actionId: 'singleDocument' | 'surroundingDocument') {
    // `~` = CSS whole-word match against the space-separated test-subj list.
    const action = this.page.testSubj.locator(`~docTableRowAction-${actionId}`);
    await expect(action).toBeVisible();
    await action.click();
  }

  /**
   * Inside an open document-viewer flyout, click a per-field cell action
   * (e.g. `addFilterButton`, `addExistsFilterButton`, `toggleColumnButton`).
   * The cell-action buttons are revealed on hover, so this hovers the field
   * row name first.
   */
  async clickFieldActionInFlyout(fieldName: string, actionTestSubj: string) {
    const flyout = this.page.testSubj.locator('docViewerFlyout');
    await expect(async () => {
      const nameCell = flyout.locator(`[data-test-subj="tableDocViewRow-${fieldName}-name"]`);
      await nameCell.evaluate((el) => {
        el.scrollIntoView({ block: 'center', inline: 'nearest' });
      });
      await nameCell.hover();
      const actionButton = flyout.locator(`[data-test-subj="${actionTestSubj}-${fieldName}"]`);
      await actionButton.waitFor({ state: 'visible' });
      await actionButton.click();
    }).toPass({ timeout: 15_000 });
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
   * `true` if the histogram chart is currently visible. Mirrors FTR
   * `discover.isChartVisible()` — chart visibility is controlled by
   * `dscShowHistogramButton` / `dscHideHistogramButton` toggles which
   * mount/unmount the `unifiedHistogramChart` test-subject.
   */
  async isChartVisible(): Promise<boolean> {
    return this.page.testSubj.isVisible('unifiedHistogramChart');
  }

  /**
   * Toggle the histogram chart on/off. Mirrors FTR `discover.toggleChartVisibility()`.
   */
  async toggleChartVisibility(): Promise<void> {
    if (await this.isChartVisible()) {
      await this.page.testSubj.click('dscHideHistogramButton');
      await this.page.testSubj.locator('unifiedHistogramChart').waitFor({ state: 'detached' });
    } else {
      await this.page.testSubj.click('dscShowHistogramButton');
      await this.page.testSubj.locator('unifiedHistogramChart').waitFor({ state: 'visible' });
    }
  }

  /**
   * `true` if the histogram is showing the "interval truncated" warning
   * tooltip (e.g. when the requested interval is finer than the bucketing
   * resolution allows).
   */
  async getChartIntervalWarningIcon(): Promise<boolean> {
    return this.page
      .locator('[data-test-subj="unifiedHistogramRendered"] .euiToolTipAnchor')
      .count()
      .then((c) => c > 0);
  }

  /**
   * `true` if the histogram chart has rendered a `<canvas>` element — the
   * Scout equivalent of FTR `elasticChart.canvasExists()` scoped to the
   * Discover unified histogram. Returns `false` when the chart is hidden
   * or still loading.
   */
  async chartCanvasExists(): Promise<boolean> {
    return (
      (await this.page
        .locator('[data-test-subj="unifiedHistogramChart"] .echCanvasRenderer')
        .count()) > 0
    );
  }

  /**
   * Drag-select a window on the histogram canvas. Mirrors FTR
   * `discover.brushHistogram()` — same offsets so the resulting time-range
   * width matches what FTR asserts (~23h on the long_window archive).
   */
  async brushHistogram(): Promise<void> {
    // Same canvas the FTR `elasticChart.getCanvas()` picks: the per-chart
    // renderer canvas (`.echCanvasRenderer`) inside the unified histogram.
    const canvas = this.page.locator('[data-test-subj="unifiedHistogramChart"] .echCanvasRenderer');
    await canvas.waitFor({ state: 'visible' });
    const box = await canvas.boundingBox();
    if (!box) throw new Error('histogram canvas has no bounding box');
    // FTR uses canvas-element relative offsets: start at (-300, 20) from the
    // canvas right edge, end at (-100, 30). Translate that to viewport coords.
    const startX = box.x + box.width - 300;
    const startY = box.y + box.height / 2 + 20;
    const endX = box.x + box.width - 100;
    const endY = box.y + box.height / 2 + 30;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX + (endX - startX) / 2, startY + (endY - startY) / 2, {
      steps: 5,
    });
    await this.page.mouse.move(endX, endY, { steps: 5 });
    await this.page.mouse.up();
  }

  /**
   * Wait for Discover's error-callout to surface. Mirrors FTR
   * `discover.showsErrorCallout()`.
   */
  async showsErrorCallout(): Promise<void> {
    await expect(this.page.testSubj.locator('discoverErrorCalloutTitle')).toBeVisible();
  }

  /**
   * Click the "New search" button in the Discover top nav menu. Mirrors
   * FTR `discover.clickNewSearchButton()`, including its handling of the
   * overflow menu — in narrow viewports / certain chrome states the
   * `discoverNewButton` is hidden behind an overflow popover and a bare
   * `testSubj.click('discoverNewButton')` times out.
   */
  async clickNewSearchButton({
    isInOverflowMenu,
  }: { isInOverflowMenu?: boolean } = {}): Promise<void> {
    await this.clickAppMenuItem('discoverNewButton', { isInOverflowMenu });
    await this.waitUntilSearchingHasFinished();
  }

  /**
   * Switch the active data view via the data-view picker. Mirrors FTR
   * `discover.selectIndexPattern(name)`.
   */
  async selectIndexPattern(name: string): Promise<void> {
    await this.page.testSubj.click('*dataView-switch-link');
    await this.page.testSubj.waitForSelector('indexPattern-switcher', { state: 'visible' });
    await this.page.testSubj.fill('indexPattern-switcher--input', name);
    await this.page.locator(`[data-test-subj="indexPattern-switcher"] [title="${name}"]`).click();
    await this.waitUntilSearchingHasFinished();
  }

  /**
   * Wait until the Discover doc table has finished rendering. Mirrors FTR
   * `discover.waitForDocTableLoadingComplete()` — the doc table flips its
   * `data-render-complete` attribute to `'true'` after the last paint.
   */
  async waitForDocTableLoadingComplete(): Promise<void> {
    await expect(this.page.testSubj.locator('discoverDocTable')).toHaveAttribute(
      'data-render-complete',
      'true',
      { timeout: 30_000 }
    );
  }

  /**
   * Assert that running `cb` triggers exactly `expectedCount` matching
   * search requests, observed via the browser's `performance` resource
   * timing buffer. Mirrors FTR `discover.expectSearchRequestCount(type,
   * count, cb)`.
   *
   * `type`:
   *   - `'ese'`  → standard data view search (`/internal/search/ese`)
   *   - `'esql'` → ES|QL async search (`/internal/search/esql_async`)
   *
   * The perf API is page-scoped and survives navigations only within the
   * same document, so callers should not navigate between the reset and
   * the assertion. A 5×500 ms retry is used (same as FTR) to absorb
   * late-firing responses.
   */
  async expectSearchRequestCount(
    type: 'ese' | 'esql',
    expectedCount: number,
    cb?: () => Promise<void>
  ): Promise<void> {
    const searchPath = type === 'esql' ? 'esql_async' : 'ese';
    const endpointSuffix = `/internal/search/${searchPath}`;

    if (cb) {
      await this.page.evaluate(() => {
        performance.setResourceTimingBufferSize(Number.MAX_SAFE_INTEGER);
        performance.clearResourceTimings();
      });
      await cb();
    }

    await expect
      .poll(
        async () => {
          await this.waitUntilSearchingHasFinished();
          return this.page.evaluate((suffix) => {
            return performance
              .getEntries()
              .filter(
                (entry) =>
                  ['fetch', 'xmlhttprequest'].includes(
                    (entry as PerformanceResourceTiming).initiatorType
                  ) && entry.name.endsWith(suffix)
              ).length;
          }, endpointSuffix);
        },
        {
          message: `expected ${expectedCount} request(s) to ${endpointSuffix}`,
          timeout: 3000,
          intervals: [500, 500, 500, 500, 500],
        }
      )
      .toBe(expectedCount);
  }

  /**
   * Click the histogram breakdown selector and pick `field` (or `"No breakdown"`).
   */
  /**
   * Choose a histogram breakdown field by display name. Pass `value` to
   * select an option whose `value` attribute differs from the field name
   * (used by `clearBreakdownField()` for the special `__EMPTY_SELECTOR_OPTION__`).
   */
  async chooseBreakdownField(field: string, value: string = field) {
    await this.page.testSubj.click('unifiedHistogramBreakdownSelectorButton');
    await this.page.testSubj.waitForSelector('unifiedHistogramBreakdownSelectorSelectable', {
      state: 'visible',
    });
    await this.page.testSubj.fill('unifiedHistogramBreakdownSelectorSelectorSearch', field);
    await this.page
      .locator(
        `[data-test-subj="unifiedHistogramBreakdownSelectorSelectable"] .euiSelectableListItem[value="${value}"]`
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

  /**
   * Whether Discover is currently showing the empty-state "no results" panel.
   * Mirrors FTR `discover.hasNoResults()`.
   */
  async hasNoResults(): Promise<boolean> {
    return await this.page.testSubj.isVisible('discoverNoResults');
  }

  /**
   * Whether the "no results" panel includes the time-range suggestion (the
   * "expand the time range" hint that only renders for time-based data views).
   * Mirrors FTR `discover.hasNoResultsTimepicker()`.
   */
  async hasNoResultsTimepicker(): Promise<boolean> {
    return await this.page.testSubj.isVisible('discoverNoResultsTimefilter');
  }

  /**
   * Assert there is no "unsaved changes" notification indicator on the
   * Discover save button. The indicator is rendered by the EUI split-button
   * with `data-test-subj="split-button-notification-indicator"`.
   */
  async ensureNoUnsavedChangesIndicator(): Promise<void> {
    await expect(this.page.testSubj.locator('split-button-notification-indicator')).toBeHidden();
  }

  /**
   * Assert the Discover save button currently shows the "unsaved changes"
   * notification indicator.
   */
  async ensureHasUnsavedChangesIndicator(): Promise<void> {
    await expect(this.page.testSubj.locator('split-button-notification-indicator')).toBeVisible();
  }

  /**
   * Click the Discover save button on a saved search that already has unsaved
   * changes (i.e. with the notification indicator showing) and confirm the
   * save modal. Mirrors FTR `discover.saveUnsavedChanges()`.
   */
  async saveUnsavedChanges(): Promise<void> {
    await this.page.testSubj.hover('discoverSaveButton');
    await this.page.testSubj.click('discoverSaveButton');
    await this.page.testSubj.waitForSelector('confirmSaveSavedObjectButton', {
      state: 'visible',
    });
    await this.page.testSubj.click('confirmSaveSavedObjectButton');
    await this.waitUntilSearchingHasFinished();
  }

  /**
   * Reset the histogram breakdown field back to "No breakdown". Mirrors FTR
   * `discover.clearBreakdownField()` which delegates to `chooseBreakdownField`
   * with the empty-selector option.
   */
  async clearBreakdownField(): Promise<void> {
    await this.chooseBreakdownField('No breakdown', '__EMPTY_SELECTOR_OPTION__');
  }

  /**
   * Extract the data view id from the current Discover URL. The URL embeds
   * `dataViewId:<id>` in both `_g` and `_a` (sometimes the saved-search id
   * carries it too); this returns that id and throws if the URL holds
   * conflicting ids — mirroring FTR `discover.getCurrentDataViewId()`.
   */
  async getCurrentDataViewId(): Promise<string> {
    const url = this.page.url();
    const ids = Array.from(url.matchAll(/dataViewId:[^,)]*/g)).map(([match]) =>
      decodeURIComponent(match).replace('dataViewId:', '').replaceAll("'", '')
    );
    const first = ids[0];
    if (!first) {
      throw new Error(`Discover URL has no dataViewId: ${url}`);
    }
    if (!ids.every((id) => id === first)) {
      throw new Error(
        `Discover URL state contains different data view ids; expected all to match ${first}: ${ids.join(
          ', '
        )}`
      );
    }
    return first;
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
    // EUI's grid hides the header action button until the cell is hovered.
    // Hover the cell, then click the action button (not the header itself —
    // that opens the column-resize handle, not the menu). Mirrors FTR
    // `dataGrid.openColMenuByField`.
    const cell = this.page.testSubj.locator(`dataGridHeaderCell-${field}`);
    await cell.hover();
    const actionButton = this.page.testSubj.locator(`dataGridHeaderCellActionButton-${field}`);
    await actionButton.click();
    const actionGroup = this.page.testSubj.locator(`dataGridHeaderCellActionGroup-${field}`);
    await expect(actionGroup).toBeVisible();
    await actionGroup.locator(`button:has-text("${sortOption}")`).click();
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

  async writeAndSubmitKqlQuery(query: string) {
    const currentMode = await this.getCurrentQueryMode();

    if (currentMode !== 'classic') {
      throw new Error(
        `writeAndSubmitKqlQuery requires Discover to be in classic mode, but the current mode is "${currentMode}".`
      );
    }

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
    const currentMode = await this.getCurrentQueryMode();

    if (currentMode !== 'esql') {
      await this.page.testSubj.click('select-text-based-language-btn');
    }

    await this.waitUntilSearchingHasFinished();
    await this.codeEditor.waitCodeEditorReady('ESQLEditor');
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

  /**
   * Locator for the currently selected Discover tab button in the unified
   * tabs bar.
   */
  private get activeTabLocator(): Locator {
    return this.page.testSubj
      .locator(UNIFIED_TABS_TEST_SUBJ.tabsBar)
      .locator(
        `[data-test-subj^="${UNIFIED_TABS_TEST_SUBJ.selectTabBtnPrefix}"][aria-selected="true"]`
      );
  }

  /**
   * Clicks the "New tab" button in the Discover tab bar and waits for the
   * newly created tab to become the active one.
   */
  /**
   * Open the Inspector flyout from the currently active Discover tab's menu.
   * Mirrors FTR `discover.openInspectorFromTabMenu()` — the inspector is
   * scoped to the per-tab menu in the unified tabs UI rather than to the
   * global app menu.
   */
  async openInspectorFromTabMenu() {
    if (await this.page.testSubj.isVisible('inspectorPanel')) {
      return;
    }
    const activeTabTestSubj = await this.getActiveTabTestSubj();
    const tabId = activeTabTestSubj.slice(UNIFIED_TABS_TEST_SUBJ.selectTabBtnPrefix.length);
    await this.page.testSubj.click(`${UNIFIED_TABS_TEST_SUBJ.tabMenuBtnPrefix}${tabId}`);
    await this.page.testSubj.click(UNIFIED_TABS_TEST_SUBJ.inspectMenuItem);
    await this.page.testSubj.waitForSelector('inspectorPanel', { state: 'visible' });
  }

  async createNewTab() {
    await this.page.testSubj.click(UNIFIED_TABS_TEST_SUBJ.newTabBtn);
    await this.activeTabLocator.waitFor({ state: 'visible' });
  }

  /**
   * Returns the `data-test-subj` of the currently selected Discover tab
   * (e.g. `unifiedTabs_selectTabBtn_<id>`). Useful for capturing a tab id
   * before navigating away so it can be restored later by test-subj.
   */
  async getActiveTabTestSubj(): Promise<string> {
    await this.activeTabLocator.waitFor({ state: 'visible' });
    const testSubj = await this.activeTabLocator.getAttribute('data-test-subj');
    if (!testSubj) {
      throw new Error('Active Discover tab is missing a data-test-subj attribute');
    }
    return testSubj;
  }

  /**
   * Switches to the Discover tab identified by the given full
   * `unifiedTabs_selectTabBtn_<id>` test subject and waits for it to become
   * the active tab.
   */
  async navigateToTabByTestSubj(testSubj: string) {
    await this.page.testSubj.click(testSubj);
    await this.page
      .locator(`[data-test-subj="${testSubj}"][aria-selected="true"]`)
      .waitFor({ state: 'visible' });
  }

  /**
   * Duplicates the currently active Discover tab via its tab menu.
   * The duplicated tab becomes the active one; this helper waits for the
   * active-tab marker to move to a different test subject before returning.
   */
  async duplicateActiveTab() {
    const originalTestSubj = await this.getActiveTabTestSubj();
    const tabId = originalTestSubj.slice(UNIFIED_TABS_TEST_SUBJ.selectTabBtnPrefix.length);

    await this.page.testSubj.click(`${UNIFIED_TABS_TEST_SUBJ.tabMenuBtnPrefix}${tabId}`);
    await this.page.testSubj.click(UNIFIED_TABS_TEST_SUBJ.duplicateMenuItem);

    await this.page
      .locator(
        `[data-test-subj^="${UNIFIED_TABS_TEST_SUBJ.selectTabBtnPrefix}"][aria-selected="true"]:not([data-test-subj="${originalTestSubj}"])`
      )
      .waitFor({ state: 'visible' });
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
}
