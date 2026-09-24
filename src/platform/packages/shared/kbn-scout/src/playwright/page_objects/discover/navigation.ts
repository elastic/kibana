/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from '../../../..';
import { expect } from '../..';
import {
  DiscoverAppBase,
  DISCOVER_QUERY_MODE_KEY,
  type DiscoverGotoOptions,
  type DiscoverQueryMode,
} from './base';

/**
 * Navigation, query-mode, ES|QL editor, wait helpers, and chrome app-menu actions.
 * Applied as the first mixin layer so all later mixins can call these methods via `this`.
 */
export abstract class NavigationMixin extends DiscoverAppBase {
  async goto(options: DiscoverGotoOptions) {
    await this.setQueryMode(options.queryMode);
    await this.page.gotoApp(
      'discover',
      options.savedSearchId ? { hash: `/view/${options.savedSearchId}` } : undefined
    );
    await this.waitForDiscoverPage();
  }

  protected async waitForDiscoverPage() {
    // Discover initialization in serverless CI environments regularly exceeds the default 10s,
    // likely due to additional plugin overhead and root profile resolution.
    await expect(this.page.testSubj.locator('dscPage')).toBeVisible({ timeout: 30_000 });
  }

  protected async hideTabPreview() {
    await this.page.mouse.move(0, 0);
    await this.page.testSubj.locator('unifiedTabs_tabPreview_contentPanel').waitFor({
      state: 'hidden',
    });
  }

  getRefreshDataButton(): Locator {
    return this.page.testSubj.locator('refreshDataButton');
  }

  getUninitializedPrompt(): Locator {
    return this.page.testSubj.locator('discoverUninitialized');
  }

  getUninitializedKeyboardShortcuts(): Locator {
    return this.page.testSubj.locator('discoverUninitializedKeyboardShortcuts');
  }

  // Waits for a Discover tab to finish loading.
  async waitUntilTabIsLoaded() {
    await this.waitForDiscoverPage();
    await this.waitUntilSearchingHasFinished();
  }

  async waitUntilSearchingHasFinished() {
    await this.dataGrid.waitForLoad();
    await this.waitUntilHitCountHasSettled();
  }

  private async waitUntilHitCountHasSettled() {
    const loadingCounter = this.page.testSubj
      .locator('discoverQueryTotalHits')
      .and(this.page.locator('[data-fetch-status="loading"]'));

    await loadingCounter.waitFor({ state: 'hidden', timeout: 30_000 });
  }

  /**
   * Seeds the persisted query mode in localStorage on the next page load. Discover
   * ignores `currentMode` unless `defaultMode` matches the resolved default (the
   * `discover.isEsqlDefault` flag), so `defaultMode` defaults to `'classic'` to
   * match today's default. When the flag is flipped to make ES|QL the default,
   * update `defaultMode` or the seed is ignored.
   *
   * Not idempotent: each call adds an `addInitScript` that reruns on every later
   * load in order, so the last write wins. Avoid calling it more than once per
   * test unless that stacking is intentional.
   */
  public setQueryMode(currentMode: DiscoverQueryMode, defaultMode: DiscoverQueryMode = 'classic') {
    return this.page.addInitScript(
      ({ storageKey, storageValue }) => {
        window.localStorage.setItem(storageKey, storageValue);
      },
      {
        storageKey: DISCOVER_QUERY_MODE_KEY,
        storageValue: JSON.stringify({ currentMode, defaultMode }),
      }
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

  async selectTextBaseLang() {
    const currentMode = await this.getCurrentQueryMode();

    if (currentMode !== 'esql') {
      await this.page.testSubj.click('select-text-based-language-btn');
    }

    await this.codeEditor.waitCodeEditorReady('ESQLEditor');
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

  async writeAndSubmitEsqlQuery(query: string) {
    await this.selectTextBaseLang();
    await this.codeEditor.setCodeEditorValue(query);
    await this.submitQueryAndWait();
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
   * Submits the current query (classic search bar or ES|QL editor) by clicking
   * the query submit button. Does not wait for results — pair with
   * `submitQueryAndWait()` or `waitUntilTabIsLoaded()` as appropriate.
   */
  async submitQuery() {
    await this.hideTabPreview();
    await this.page.testSubj.click('querySubmitButton');
  }

  /**
   * Submits the current query and waits until the tab has finished loading.
   */
  async submitQueryAndWait() {
    await this.submitQuery();
    await this.waitUntilTabIsLoaded();
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
      await this.codeEditor.setCodeEditorValue(previousEsqlQuery);
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

  async getEsqlQueryValue(nthIndex: number = 0): Promise<string> {
    return this.codeEditor.getCodeEditorValue(nthIndex);
  }

  async clickAppMenuItem(testId: string) {
    await this.appMenu.clickItem(testId);
  }

  private async dismissHoverOverlays() {
    await this.page.mouse.move(0, 0);
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
    await this.dismissHoverOverlays();
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
}
