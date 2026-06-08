/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '..';
import { expect } from '../../../ui';

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
    await input.fill(query);
    // Confirm React state has flushed before the caller submits. Without
    // this, a fast `submitQuery()` race can run with the previous (empty)
    // query because the unified-search bar reads its value from controlled
    // state on the keydown handler.
    await expect(input).toHaveValue(query);
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
    // Mirrors FTR `queryBar.submitQuery()` exactly: click the input to give
    // it focus (stronger than `.focus()` for some EUI inputs that gate
    // their submit handler on `mousedown`/`click` events) then press
    // Enter at the page level so the event dispatches against the active
    // element. This combination is more robust than a locator-scoped
    // `press('Enter')` against `.focus()`, which races the unified-search
    // bar's controlled state on fast `setQuery()` → `submitQuery()` paths.
    await this.page.testSubj.click('queryInput');
    await this.page.keyboard.press('Enter');
  }

  /**
   * Click the unified-search refresh / update button. Mirrors FTR
   * `queryBar.clickQuerySubmitButton()`. Use this in request-count tests
   * where the precise number of triggered fetches matters — a single
   * click is the cleanest possible refresh action and avoids ambiguity
   * around keyboard event chains.
   */
  async clickQuerySubmitButton(): Promise<void> {
    await this.page.testSubj.click('querySubmitButton');
  }

  /**
   * Read the current value of the query input (mirrors FTR
   * `queryBar.getQueryString`).
   */
  async getQueryString(): Promise<string> {
    return (await this.page.testSubj.locator('queryInput').inputValue()) ?? '';
  }
}
