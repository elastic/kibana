/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '..';

export type QueryBarLanguage = 'kql' | 'lucene';

const LANGUAGE_MENU_LABEL: Record<QueryBarLanguage, string> = {
  kql: 'KQL',
  lucene: 'Lucene',
};

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

  /** Switches the unified-search query bar between KQL and Lucene via the query-bar menu. */
  async switchQueryLanguage(language: QueryBarLanguage): Promise<void> {
    const menuButton = this.page.testSubj.locator('showQueryBarMenu');
    const menuPanel = this.page.testSubj.locator('queryBarMenuPanel');
    const languageItem = this.page.testSubj.locator(`${language}LanguageMenuItem`);
    const languageLabel = LANGUAGE_MENU_LABEL[language];

    await menuButton.click();
    await menuPanel.waitFor({ state: 'visible' });
    await this.page.testSubj.locator('switchQueryLanguageButton').click();
    await languageItem.click();
    await this.page.testSubj.locator('contextMenuPanelTitleButton').click();
    await this.page.testSubj
      .locator('switchQueryLanguageButton', { hasText: `Language: ${languageLabel}` })
      .waitFor({ state: 'visible' });
    await menuButton.click();
    await menuPanel.waitFor({ state: 'hidden' });
  }
}
