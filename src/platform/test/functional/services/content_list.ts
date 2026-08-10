/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrService } from '../ftr_provider_context';

const CONTENT_LIST_TABLE = 'content-list-table';
const CONTENT_LIST_TABLE_SKELETON = 'content-list-table-skeleton';
const CONTENT_LIST_TABLE_ITEM_LINK = 'content-list-table-item-link';
const CONTENT_LIST_TOOLBAR_SEARCH_BOX = 'contentListToolbar-searchBox';
const CONTENT_LIST_TABLE_SELECT_ALL = 'checkboxSelectAll';
const CONTENT_LIST_SELECTION_BAR_DELETE = 'contentListToolbar-selectionBar-deleteButton';
const CONFIRM_MODAL_CONFIRM_BUTTON = 'confirmModalConfirmButton';

/**
 * FTR counterpart to the Scout `ContentListWrapper` page object, exposing the
 * same `@kbn/content-list` toolbar/table locators as a reusable service so any
 * suite migrating off `TableListView` can drop the legacy `listingTable`
 * helpers without rebuilding them. Selectors must stay in sync with
 * `src/platform/packages/shared/kbn-scout/src/playwright/page_objects/content_list.ts`.
 */
export class ContentListService extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly retry = this.ctx.getService('retry');
  private readonly log = this.ctx.getService('log');
  private readonly common = this.ctx.getPageObject('common');

  /** Waits for the content list table to render and the loading skeleton to disappear. */
  public async waitForReady() {
    await this.testSubjects.existOrFail(CONTENT_LIST_TABLE, { timeout: 10_000 });
    await this.testSubjects.missingOrFail(CONTENT_LIST_TABLE_SKELETON);
  }

  /** All rendered item links (one per row) on the current page. */
  public async findItemLinks() {
    return this.testSubjects.findAll(CONTENT_LIST_TABLE_ITEM_LINK);
  }

  /** Retries until the visible item-link count matches `count`. */
  public async expectItemCount(count: number) {
    await this.retry.try(async () => {
      const links = await this.findItemLinks();
      expect(links.length).to.equal(count);
    });
  }

  /** Returns the visible (trimmed) text of every row link on the current page. */
  public async getItemNames(): Promise<string[]> {
    const links = await this.findItemLinks();
    const names = await Promise.all(links.map((link) => link.getVisibleText()));
    return names.map((name) => name.trim());
  }

  /** Clicks the row whose link text exactly matches `name`. Retries to absorb re-renders. */
  public async clickItemByName(name: string) {
    await this.retry.try(async () => {
      const links = await this.findItemLinks();
      for (const link of links) {
        const text = (await link.getVisibleText()).trim();
        if (text === name) {
          await link.click();
          return;
        }
      }
      throw new Error(`No content list row found with name "${name}".`);
    });
  }

  /**
   * Sets the toolbar search input to `query` and commits with Enter. The
   * underlying `EuiSearchBar` is incremental, so we mirror the legacy
   * `listingTable.searchForItemWithName` semantics by pressing Enter to
   * force the debounced filter to apply before the test moves on.
   */
  public async search(query: string) {
    this.log.debug(`ContentList.search: ${query}`);
    const searchBox = await this.testSubjects.find(CONTENT_LIST_TOOLBAR_SEARCH_BOX);
    await searchBox.click();
    await searchBox.clearValueWithKeyboard();
    await searchBox.type(query);
    await this.common.pressEnterKey();
    await this.waitForReady();
  }

  /** Empties the toolbar search input and commits with Enter. */
  public async clearSearch() {
    this.log.debug('ContentList.clearSearch');
    const searchBox = await this.testSubjects.find(CONTENT_LIST_TOOLBAR_SEARCH_BOX);
    await searchBox.click();
    await searchBox.clearValueWithKeyboard();
    await this.common.pressEnterKey();
    await this.waitForReady();
  }

  /**
   * Selects every visible row via the header checkbox, then triggers the
   * selection-bar bulk delete and confirms the modal. Mirrors the Scout
   * `ContentListWrapper.selectAllAndDelete` helper.
   */
  public async selectAllAndDelete() {
    this.log.debug('ContentList.selectAllAndDelete');
    await this.testSubjects.click(CONTENT_LIST_TABLE_SELECT_ALL);
    await this.testSubjects.click(CONTENT_LIST_SELECTION_BAR_DELETE);
    await this.testSubjects.click(CONFIRM_MODAL_CONFIRM_BUTTON);
  }

  /**
   * Drop-in replacement for `listingTable.deleteItem(name)`: narrows the list
   * to the named row via toolbar search, then bulk-deletes the (sole) match.
   */
  public async deleteItem(name: string) {
    this.log.debug(`ContentList.deleteItem: ${name}`);
    await this.search(name);
    await this.selectAllAndDelete();
  }
}
