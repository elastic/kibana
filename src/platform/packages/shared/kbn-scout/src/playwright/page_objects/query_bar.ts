/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '..';

/**
 * Page object for the global query text input (`queryInput`) shared by
 * Discover, Dashboard, Maps, Visualize/Lens and other apps that embed
 * `unified_search`. Covers setting and clearing the live query without
 * submitting; callers own the submit step when they need it.
 */
export class QueryBar {
  constructor(private readonly page: ScoutPage) {}

  async setQuery(query: string): Promise<void> {
    const input = this.page.testSubj.locator('queryInput');
    await input.clear();
    await input.pressSequentially(query);
  }

  async getQuery(): Promise<string> {
    return this.page.testSubj.locator('queryInput').inputValue();
  }

  async clearQuery(): Promise<void> {
    await this.page.testSubj.clearInput('queryInput');
  }

  /** Submits the current query via the "Update"/"Refresh" button. */
  async submitQuery(): Promise<void> {
    await this.page.testSubj.click('querySubmitButton');
  }

  /**
   * Switches the query language via the query bar's "..." options menu (`showQueryBarMenu`).
   * Unlike the standalone language switcher (e.g. Lens dimension "filter by" inputs), the
   * top-level query bar renders the switcher inline inside that menu's `selectLanguage` panel
   * rather than behind its own popover button, so the menu must be opened first and the
   * `switchQueryLanguageButton` item navigates to the panel rather than toggling a popover.
   * `EuiSelectable`'s `onChange` only reports the selection — it does not close the menu —
   * so a second click of the menu toggle is required to dismiss it.
   */
  async switchQueryLanguage(language: 'kql' | 'lucene'): Promise<void> {
    const menuToggle = this.page.testSubj.locator('showQueryBarMenu');
    const menuPanel = this.page.testSubj.locator('queryBarMenuPanel');
    await menuToggle.click();
    await menuPanel.waitFor({ state: 'visible' });
    await this.page.testSubj.click('switchQueryLanguageButton');
    const languageItem = this.page.testSubj.locator(`${language}LanguageMenuItem`);
    await languageItem.waitFor({ state: 'visible' });
    await languageItem.click();
    await menuToggle.click();
    await menuPanel.waitFor({ state: 'hidden' });
  }
}
