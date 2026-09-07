/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Opening new Discover tabs in classic and ES|QL modes, per-tab state isolation,
 * and stability when many tabs are opened quickly.
 */

import { setTimeout as delay } from 'timers/promises';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

const ESQL_ASYNC_ENDPOINT = '/internal/search/esql_async';
// Long enough that a tab's ES|QL fetch is still in flight when the next tab is
// opened during the rapid-open burst, keeping the race window deterministic
// regardless of dataset size and CI load.
const ESQL_RESPONSE_DELAY_MS = 1_000;
// Only the request that starts a search. Async-search polls and cancels target
// `${ESQL_ASYNC_ENDPOINT}/<searchId>`, and holding those back would both add a
// delay per poll and inflate `pollSearch`'s elapsed-time back-off, without
// widening the race window this test needs.
const isEsqlSearchStart = (url: URL) => url.pathname.endsWith(ESQL_ASYNC_ENDPOINT);

spaceTest.describe('Discover tabs - opening a new tab', { tag: '@local-stateful-classic' }, () => {
  // Every test here drives several tabs through full data fetches, and creating a
  // data view adds an index-sources lookup on top, so these do far more work than
  // the default budget allows on a loaded CI worker.
  //
  // The allowance also has to cover a data view creation that retries: that helper
  // gates retries on a 30s window but cannot abort an attempt already in flight, so
  // a retry starting just under the window still runs to completion. At 90s the test
  // budget expired first and reported a bare `Test timeout of 90000ms exceeded` with
  // no sign of the assertion that actually failed (#274869).
  spaceTest.setTimeout(150_000);

  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('should create a new tab in classic mode', async ({ pageObjects }) => {
    const { discover, filterBar, queryBar, unifiedTabs } = pageObjects;
    const KQL_QUERY = 'machine.os: "macOS"';

    // tab 0 - created automatically with the default data view

    await spaceTest.step(
      'tab 1: create a new tab, create another data view from search bar, set query and filter',
      async () => {
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();

        await discover.createDataViewFromSearchBar({ name: 'logsta' });
        await discover.waitUntilTabIsLoaded();

        await filterBar.addFilter({ field: 'extension', operator: 'is', value: 'jpeg' });
        await discover.writeAndSubmitKqlQuery(KQL_QUERY);
        await discover.waitUntilTabIsLoaded();
      }
    );

    await spaceTest.step('tab 2: create another new tab in ES|QL mode', async () => {
      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getEsqlQueryValue()).toBe('FROM logsta* | SORT @timestamp DESC');
    });

    await spaceTest.step(
      'switching tabs restores each tab data view, query and filters',
      async () => {
        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getSelectedDataViewName()).toBe('logstash-*');
        expect(await queryBar.getQuery()).toBe('');
        expect(await filterBar.getFilterCount()).toBe(0);

        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getSelectedDataViewName()).toBe('logsta*');
        expect(await queryBar.getQuery()).toBe(KQL_QUERY);
        expect(await filterBar.getFilterCount()).toBe(1);
      }
    );

    await spaceTest.step(
      'a new tab inherits the active data view with an empty query and no filters',
      async () => {
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getSelectedDataViewName()).toBe('logsta*');
        expect(await queryBar.getQuery()).toBe('');
        expect(await filterBar.getFilterCount()).toBe(0);
      }
    );
  });

  spaceTest('should create a new tab in ES|QL mode', async ({ pageObjects }) => {
    const { discover, unifiedTabs } = pageObjects;
    const defaultQuery = 'FROM logst* | SORT @timestamp DESC';
    const updatedQuery = 'FROM logst* | LIMIT 1050';

    // tab 0 - created automatically with the default data view

    await spaceTest.step('tab 0: create an ad hoc data view from the search bar', async () => {
      expect(await discover.getCurrentQueryMode()).toBe('classic');
      await discover.createDataViewFromSearchBar({ name: 'logst' });
    });

    await spaceTest.step(
      'tab 1: new ES|QL tab defaults to FROM logst* and accepts an edited query',
      async () => {
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getEsqlQueryValue()).toBe(defaultQuery);

        await discover.codeEditor.setCodeEditorValue(updatedQuery);
        await discover.submitQuery();
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getEsqlQueryValue()).toBe(updatedQuery);
      }
    );

    await spaceTest.step('tab 2: another new tab resets to the default FROM logst*', async () => {
      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getEsqlQueryValue()).toBe(defaultQuery);
    });
  });

  // TODO should be removed/modified after empty canvas is implemented #255686
  spaceTest('should be able to complete all quickly opened tabs', async ({ page, pageObjects }) => {
    const { discover, unifiedTabs } = pageObjects;

    // Each new tab clones the current one and refetches, so holding back the
    // start of every search keeps a fetch in flight whenever the next tab
    // opens. This reproduces the rapid-open race deterministically. The test
    // previously created the same window with an intentionally expensive query
    // (`FROM *` over a 25-year range), which tied the window — and the test's
    // runtime — to dataset size and CI load, producing the timeouts in #274834.
    let holdSearches = true;

    // The handler stays installed for the whole test and is switched off with
    // the flag rather than by `page.unroute`, which does not wait for handlers
    // that are still sleeping: it resolves the requests they are holding, and
    // the delayed wake-up then fails with `Route is already handled!`.
    await page.route(isEsqlSearchStart, async (route) => {
      if (holdSearches) {
        await delay(ESQL_RESPONSE_DELAY_MS);
      }
      await route.continue();
    });

    await spaceTest.step('set up an ES|QL query', async () => {
      // A single index pattern rather than `FROM *`: every tab's fetch resolves
      // the pattern to a data view, and resolving all indices costs about a
      // second each time under CI load. The delay above, not the query, is what
      // holds the race window open now.
      await discover.writeAndSubmitEsqlQuery('FROM logstash-*');
      await discover.waitUntilTabIsLoaded();
    });

    await spaceTest.step('open many tabs rapidly, then confirm each one loads', async () => {
      const newTabCount = 7;

      // Click without waiting between clicks to reproduce the rapid-open race.
      for (let i = 0; i < newTabCount; i++) {
        await unifiedTabs.clickNewTabButton();
      }
      await discover.waitUntilTabIsLoaded();

      // The race window has been created, so stop holding searches back: the
      // per-tab walk below only verifies that every tab settles, and paying the
      // delay again there would spend the test budget for nothing.
      holdSearches = false;

      // The initial tab plus every rapidly-opened tab should be present.
      await expect(unifiedTabs.getTabs()).toHaveCount(newTabCount + 1);

      // selectTab asserts each tab becomes active and finishes loading.
      for (let i = newTabCount - 1; i > 0; i--) {
        await unifiedTabs.selectTab(i);
        await discover.waitUntilTabIsLoaded();
        await unifiedTabs.hideTabPreview();
      }
    });
  });
});
