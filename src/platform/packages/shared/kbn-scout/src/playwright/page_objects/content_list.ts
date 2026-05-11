/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, TestType } from '@playwright/test';
import type { ScoutPage } from '..';
import type {
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
} from '../test/ui/parallel_run_fixtures';
import { expect } from '../matchers/ui';

/**
 * URL-state shape for a Content List listing page. Mirrors the keys handled by
 * `kbn-content-list-provider` URL sync (`q` and `sort`).
 */
export interface ContentListUrlState {
  /** Free-text query (the `q` URL param). */
  q?: string;
  /** Sort spec, e.g. `'title:asc'` (the `sort` URL param). */
  sort?: string;
}

/**
 * RFC 3986–friendly encoder used to mirror the form `kbn-content-list-provider`
 * writes to the URL — `:`, `,`, `(`, `)`, etc. stay readable so the regex built
 * by {@link buildContentListUrlRegex} matches what the provider actually
 * produces.
 *
 * TODO(https://github.com/elastic/kibana/issues/268689): replace this local
 * helper with the shared `encodeUriQuery` extracted from `kibana_utils` once
 * it is promoted to a shared package. Kept in lockstep with `encodeQueryValue`
 * in `@kbn/content-list-provider`'s `url_sync/encode_query_value.ts` —
 * duplicated here only because `@kbn/scout` shouldn't pull the full
 * `@kbn/content-list-provider` (and its React/EUI dep graph) just for an
 * encoder.
 */
const encodeContentListValue = (value: string): string =>
  encodeURIComponent(value)
    .replace(/%21/g, '!')
    .replace(/%24/g, '$')
    .replace(/%27/g, "'")
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .replace(/%2A/g, '*')
    .replace(/%2C/g, ',')
    .replace(/%2F/g, '/')
    .replace(/%3A/g, ':')
    .replace(/%3B/g, ';')
    .replace(/%40/g, '@');

/**
 * Builds the URL search string (including a leading `?`) for a Content List
 * page given a partial `ContentListUrlState`. Returns an empty string when no
 * params are set, so it can be appended unconditionally to a hash route.
 *
 * Mirrors `kbn-content-list-provider`'s RFC 3986–friendly encoding so colons,
 * commas, parens, etc. stay readable.
 *
 * @example
 *   buildContentListSearch({ q: 'Alpha', sort: 'title:desc' })
 *   // => '?q=Alpha&sort=title:desc'
 */
export const buildContentListSearch = (params: ContentListUrlState): string => {
  const parts: string[] = [];
  if (params.q !== undefined) {
    parts.push(`q=${encodeContentListValue(params.q)}`);
  }
  if (params.sort !== undefined) {
    parts.push(`sort=${encodeContentListValue(params.sort)}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
};

/**
 * Builds a `RegExp` matching the URL of a Content List listing page anchored
 * at the given hash route. Useful with `expect(page).toHaveURL(...)` to assert
 * the `kbn-content-list-provider` URL contract (`history.push` vs `replace`).
 *
 * @param hash - Hash route the listing is mounted at (e.g. `'#/home'`).
 * @param params - Expected URL state (`q`, `sort`).
 *
 * @example
 *   await expect(page).toHaveURL(buildContentListUrlRegex('#/home', { q: 'Alpha' }));
 */
export const buildContentListUrlRegex = (hash: string, params: ContentListUrlState): RegExp => {
  const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const target = `${hash}${buildContentListSearch(params)}`;
  return new RegExp(`${escapeRegex(target)}$`);
};

/**
 * Page-object wrapper for the `@kbn/content-list` listing UI (toolbar, table,
 * selection bar). Centralizes the `data-test-subj` selectors emitted by the
 * Content List packages so plugin tests don't have to re-derive them.
 *
 * Compose this in a plugin page object — it intentionally does not own
 * navigation, since each consuming app mounts the listing under a different
 * route and may surface app-specific buttons (e.g. an empty-prompt CTA).
 *
 * @example
 *   class GraphListingPage {
 *     readonly contentList: ContentListWrapper;
 *
 *     constructor(private readonly page: ScoutPage) {
 *       this.contentList = new ContentListWrapper(page);
 *     }
 *
 *     async goto() {
 *       await this.page.gotoApp('graph');
 *       await this.contentList.waitForReady();
 *     }
 *   }
 */
export class ContentListWrapper {
  readonly pageHeader: Locator;
  readonly toolbar: Locator;
  readonly searchBox: Locator;
  readonly clearSearchButton: Locator;
  readonly sortFilterButton: Locator;
  readonly tagsFilterButton: Locator;
  readonly createdByFilterButton: Locator;
  readonly favoritesFilterButton: Locator;
  readonly itemLinks: Locator;
  readonly noResultsPanel: Locator;
  readonly tableSelectAllCheckbox: Locator;
  readonly selectionBarDeleteButton: Locator;
  readonly deleteConfirmButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.pageHeader = page.testSubj.locator('kibana-content-list-page-header');
    this.toolbar = page.testSubj.locator('contentListToolbar');
    this.searchBox = page.testSubj.locator('contentListToolbar-searchBox');
    this.clearSearchButton = this.searchBox.getByRole('button', {
      name: 'Clear search input',
    });
    this.sortFilterButton = page.testSubj.locator('contentListSortRenderer');
    this.tagsFilterButton = page.testSubj.locator('contentListTagsRenderer');
    this.createdByFilterButton = page.testSubj.locator('contentListCreatedByRenderer');
    this.favoritesFilterButton = page.testSubj.locator('contentListStarredRenderer');
    this.itemLinks = page.testSubj.locator('content-list-table-item-link');
    this.noResultsPanel = page.testSubj.locator('contentListNoResults');
    this.tableSelectAllCheckbox = page.testSubj.locator('checkboxSelectAll');
    this.selectionBarDeleteButton = page.testSubj.locator('contentListSelectionBar-deleteButton');
    this.deleteConfirmButton = page.testSubj.locator('confirmModalConfirmButton');
  }

  /** Wait for the listing page header to render — a stable readiness signal. */
  async waitForReady() {
    await this.pageHeader.waitFor({ state: 'visible' });
  }

  /**
   * Type characters into the toolbar search box one at a time. Mirrors
   * real-user input so `EuiSearchBar`'s controlled `onChange` fires
   * incrementally — required to exercise the URL-sync `'typing'` source.
   */
  async typeIntoSearch(text: string) {
    await this.searchBox.click();
    await this.searchBox.pressSequentially(text, { delay: 30 });
  }

  /** Replace the search box value (no Enter; commit happens on debounce). */
  async setSearch(text: string) {
    await this.searchBox.fill(text);
  }

  /**
   * Replace the search box value and submit with Enter. Mirrors the typical
   * "search and apply" flow surfaced by `EuiSearchBar`.
   */
  async searchFor(text: string) {
    await this.searchBox.fill(text);
    await this.searchBox.press('Enter');
  }

  /** Clear the search box via its built-in clear-input button. */
  async clearSearch() {
    await this.clearSearchButton.click();
  }

  /** Open the sort filter popover and select the option with the given label. */
  async selectSortOption(label: string) {
    await this.sortFilterButton.click();
    await this.page.testSubj
      .locator('sortSelectOptions')
      .getByRole('option', { name: label })
      .click();
  }

  /** Select all items via the table header checkbox and confirm the bulk-delete dialog. */
  async selectAllAndDelete() {
    await this.tableSelectAllCheckbox.check();
    await this.selectionBarDeleteButton.click();
    await this.deleteConfirmButton.click();
  }
}

/**
 * Inputs required to register the standard Content List URL-sync suite for a
 * consumer plugin. The caller owns saved-object seeding, login, and the
 * surrounding `describe` block; the suite only registers the URL-contract
 * tests inside it.
 */
export interface ContentListUrlSyncSuiteOptions {
  /**
   * Hash route the listing is mounted at, including the `#` (e.g. `'#/home'`).
   * Used to anchor URL assertions via {@link buildContentListUrlRegex}.
   */
  hash: string;
  /** Navigate to the listing page with no URL params. */
  goto: (page: ScoutPage) => Promise<unknown>;
  /**
   * Navigate directly to the listing page with the given URL search string
   * (already including the leading `?`). Typically built with
   * {@link buildContentListSearch}.
   */
  gotoWithSearch: (page: ScoutPage, search: string) => Promise<unknown>;
  /**
   * A search term that matches exactly one seeded item. Must be at least two
   * characters long so the suite can verify that consecutive keystrokes
   * `replace` history rather than `push`. Used to drive both direct-navigation
   * hydration and incremental typing flows.
   */
  matchingTerm: string;
  /** Regex matching the title of the seeded item that {@link matchingTerm} matches. */
  matchingItemTitle: RegExp;
  /**
   * Optional describe-block title for the registered suite. Defaults to
   * `'Content List URL sync'`.
   */
  describeTitle?: string;
}

/**
 * Test type accepted by {@link registerContentListUrlSyncTests}. Constrained
 * to (extensions of) `ScoutParallelTestFixtures` so callers can pass their
 * own extended `spaceTest` from their plugin's `test/scout/ui/fixtures` (or
 * `test/scout_<configSet>/ui/fixtures`) module.
 */
export type ContentListUrlSyncSpaceTest<
  TestArgs extends ScoutParallelTestFixtures = ScoutParallelTestFixtures,
  WorkerArgs extends ScoutParallelWorkerFixtures = ScoutParallelWorkerFixtures
> = TestType<TestArgs, WorkerArgs>;

/**
 * Registers the standard Content List URL-sync test suite into the surrounding
 * `describe` block. The caller is responsible for seeding listing items
 * (`beforeAll`), authenticating (`beforeEach`), and cleaning up (`afterAll`)
 * so this single function is the only addition needed in each consumer's spec.
 *
 * Asserts the contract documented in `kbn-content-list-provider`:
 *
 * - Direct URL navigation hydrates `q`/`sort` into state.
 * - Typing pushes when query presence flips (empty <-> non-empty) and
 *   replaces between non-empty values.
 * - Filter commits (sort) push a new history entry.
 * - Browser back navigation walks every pushed entry in reverse.
 *
 * @example
 *   spaceTest.describe('Foo listing - URL sync', { tag: tags.stateful.classic }, () => {
 *     spaceTest.beforeAll(async ({ kbnClient, scoutSpace }) => { ... seed ... });
 *     spaceTest.beforeEach(async ({ browserAuth }) => browserAuth.loginAsPrivilegedUser());
 *     spaceTest.afterAll(async ({ scoutSpace }) => scoutSpace.savedObjects.cleanStandardList());
 *
 *     registerContentListUrlSyncTests(spaceTest, {
 *       hash: '#/home',
 *       goto: (page) => page.gotoApp('foo'),
 *       gotoWithSearch: (page, search) => page.gotoApp('foo', { hash: `/home${search}` }),
 *       matchingTerm: 'Alpha',
 *       matchingItemTitle: /Foo Alpha/,
 *     });
 *   });
 */
export const registerContentListUrlSyncTests = <
  TestArgs extends ScoutParallelTestFixtures,
  WorkerArgs extends ScoutParallelWorkerFixtures
>(
  test: ContentListUrlSyncSpaceTest<TestArgs, WorkerArgs>,
  options: ContentListUrlSyncSuiteOptions
): void => {
  const {
    hash,
    goto,
    gotoWithSearch,
    matchingTerm,
    matchingItemTitle,
    describeTitle = 'Content List URL sync',
  } = options;

  if (matchingTerm.length < 2) {
    throw new Error(
      `registerContentListUrlSyncTests: matchingTerm must be at least 2 characters (received "${matchingTerm}").`
    );
  }

  const firstChar = matchingTerm[0];
  const remainder = matchingTerm.slice(1);

  test.describe(describeTitle, () => {
    test('hydrates state from query and sort params on direct navigation', async ({ page }) => {
      const contentList = new ContentListWrapper(page);
      await gotoWithSearch(page, buildContentListSearch({ q: matchingTerm, sort: 'title:desc' }));
      await contentList.waitForReady();

      await expect(contentList.searchBox).toHaveValue(matchingTerm);
      await expect(contentList.itemLinks).toHaveCount(1);
      await expect(contentList.itemLinks).toHaveText(matchingItemTitle);
    });

    test('replaces history while typing and pushes on query presence flips', async ({ page }) => {
      const contentList = new ContentListWrapper(page);
      await goto(page);
      await contentList.waitForReady();
      await expect(page).toHaveURL(buildContentListUrlRegex(hash, {}));

      await test.step('typing from empty pushes a new entry', async () => {
        await contentList.typeIntoSearch(firstChar);
        await expect(page).toHaveURL(buildContentListUrlRegex(hash, { q: firstChar }));
      });

      await test.step('continued typing replaces the current entry', async () => {
        await contentList.typeIntoSearch(remainder);
        await expect(page).toHaveURL(buildContentListUrlRegex(hash, { q: matchingTerm }));
      });

      await test.step('back skips intermediate replaces and returns to the empty state', async () => {
        await page.goBack();
        await expect(page).toHaveURL(buildContentListUrlRegex(hash, {}));
        await expect(contentList.searchBox).toHaveValue('');
      });
    });

    test('pushes history when a filter is committed and back navigation restores prior states', async ({
      page,
    }) => {
      const contentList = new ContentListWrapper(page);
      await goto(page);
      await contentList.waitForReady();
      await expect(page).toHaveURL(buildContentListUrlRegex(hash, {}));

      await test.step('typing pushes once on presence flip', async () => {
        await contentList.typeIntoSearch(matchingTerm);
        await expect(page).toHaveURL(buildContentListUrlRegex(hash, { q: matchingTerm }));
      });

      await test.step('selecting a sort option pushes a new entry', async () => {
        await contentList.selectSortOption('Z-A');
        await expect(page).toHaveURL(
          buildContentListUrlRegex(hash, { q: matchingTerm, sort: 'title:desc' })
        );
      });

      await test.step('clearing the search pushes the empty-query state', async () => {
        await contentList.clearSearch();
        await expect(page).toHaveURL(buildContentListUrlRegex(hash, { sort: 'title:desc' }));
      });

      await test.step('back navigation walks each pushed state in reverse', async () => {
        await page.goBack();
        await expect(page).toHaveURL(
          buildContentListUrlRegex(hash, { q: matchingTerm, sort: 'title:desc' })
        );

        await page.goBack();
        await expect(page).toHaveURL(buildContentListUrlRegex(hash, { q: matchingTerm }));

        await page.goBack();
        await expect(page).toHaveURL(buildContentListUrlRegex(hash, {}));
        await expect(contentList.searchBox).toHaveValue('');
      });
    });
  });
};
