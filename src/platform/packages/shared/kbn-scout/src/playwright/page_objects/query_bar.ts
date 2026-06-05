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
    await this.page.testSubj.fill('queryInput', query);
  }

  async clearQuery(): Promise<void> {
    await this.page.testSubj.clearInput('queryInput');
  }

  /**
   * Submit the currently entered KQL query by pressing Enter inside
   * `queryInput`. Mirrors the FTR `queryBar.submitQuery()` behaviour and is
   * more robust than clicking the unified-search submit button — EUI's
   * split-button can intercept clicks while the dirty-query "Needs updating"
   * pulse is in flight. Callers should follow up with the relevant app's
   * "wait until search has finished" helper.
   */
  async submitQuery(): Promise<void> {
    const input = this.page.testSubj.locator('queryInput');
    await input.focus();
    await input.press('Enter');
  }

  /**
   * Read the current value of the query input (mirrors FTR
   * `queryBar.getQueryString`).
   */
  async getQueryString(): Promise<string> {
    return (await this.page.testSubj.locator('queryInput').inputValue()) ?? '';
  }
}
