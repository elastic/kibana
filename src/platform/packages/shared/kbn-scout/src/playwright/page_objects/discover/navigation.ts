/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '../..';
import {
  DiscoverAppBase,
  DISCOVER_QUERY_MODE_KEY,
  type DiscoverGotoOptions,
  type DiscoverQueryMode,
} from './base';

/** Navigation, query-mode switch, wait helpers, and chrome app-menu actions. */
export abstract class DiscoverNavigation extends DiscoverAppBase {
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

  /** Detects whether Discover is in ES|QL or classic mode by checking which editor is visible. */
  async getCurrentQueryMode(): Promise<DiscoverQueryMode> {
    const esqlEditor = this.page.testSubj.locator('ESQLEditor');
    const classicQueryInput = this.page.testSubj.locator('queryInput');
    await expect(esqlEditor.or(classicQueryInput)).toBeVisible();
    return (await esqlEditor.isVisible()) ? 'esql' : 'classic';
  }

  async selectTextBaseLang() {
    const currentMode = await this.getCurrentQueryMode();
    if (currentMode !== 'esql') {
      await this.page.testSubj.click('select-text-based-language-btn');
    }
    await this.codeEditor.waitCodeEditorReady('ESQLEditor');
  }

  async writeAndSubmitEsqlQuery(query: string) {
    await this.selectTextBaseLang();
    await this.codeEditor.setCodeEditorValue(query);
    await this.submitQueryAndWait();
  }

  /**
   * Submits the current query (classic or ES|QL) by clicking the query submit button.
   * Does not wait for results — pair with `submitQueryAndWait()` or `waitUntilTabIsLoaded()`.
   */
  async submitQuery() {
    await this.hideTabPreview();
    await this.page.testSubj.click('querySubmitButton');
  }

  /** Submits the current query and waits until the tab has finished loading. */
  async submitQueryAndWait() {
    await this.submitQuery();
    await this.waitUntilTabIsLoaded();
  }

  /** Waits for a Discover tab to finish loading. */
  async waitUntilTabIsLoaded() {
    await this.waitForDiscoverPage();
    await this.waitUntilSearchingHasFinished();
  }

  async clickAppMenuItem(testId: string) {
    await this.appMenu.clickItem(testId);
  }
}
