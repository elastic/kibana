/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Restoring a background search opens it in a new Discover tab, and switching away and back
 * must not re-run the restored search.
 *
 * Each test stores exactly one background search and `afterEach` removes it, so the
 * management table always holds a single row.
 *
 * Local-only: `STALLING_DSL_FILTER` relies on the `test-error-query` Elasticsearch module,
 * which is not present on Elastic Cloud.
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { BackgroundSearchTestFixtures } from '../fixtures';
import {
  spaceTest,
  BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT,
  DISCOVER_DEFAULT_KBN_ARCHIVE,
  FLIGHTS_SAMPLE_DATA_SET,
  LOGSTASH_TIME_RANGE,
  STALLING_DSL_FILTER,
} from '../fixtures';

const SESSION_HEADERS = {
  'elastic-api-version': '1',
  'kbn-xsrf': 'anything',
  'kbn-system-request': 'true',
};

/**
 * Delete every background search belonging to the logged-in browser user.
 *
 * `/internal/session` is scoped to the user that created a session, so the shared
 * `deleteAllBackgroundSearches()` helper — which runs as the `kbnClient` superuser — cannot see
 * what the browser stored. `page.request` reuses the browser's session cookie instead.
 *
 * This spec needs the cleanup to actually happen: its two tests each assert on a single-row
 * table, so a session leaking from one into the other makes the row locators ambiguous.
 */
const deleteBackgroundSearchesAsBrowserUser = async (page: ScoutPage, spaceId: string) => {
  // Playwright's request context has no baseURL configured, so build absolute URLs off the page.
  const sessionApi = (path: string) =>
    new URL(`${spaceId === 'default' ? '' : `/s/${spaceId}`}/internal/session${path}`, page.url())
      .href;

  const response = await page.request.post(sessionApi('/_find'), {
    headers: SESSION_HEADERS,
    data: { page: 1, perPage: 10_000, sortField: 'created', sortOrder: 'asc' },
  });
  const { saved_objects: savedObjects }: { saved_objects: Array<{ id: string }> } =
    await response.json();

  await Promise.all(
    savedObjects.map(({ id }) =>
      page.request.delete(sessionApi(`/${id}`), { headers: SESSION_HEADERS })
    )
  );
};

/**
 * Reopen the flyout until the single background search row reports `complete` — only then does
 * its name become a restore link.
 *
 * The flyout cannot be refreshed in place: it hides the manual refresh button, and the table's
 * auto-refresh is off by default (`refreshInterval: 0s`). Remounting it by reopening is the only
 * way to re-fetch, which is what the FTR suite did too.
 */
const reopenFlyoutUntilRowIsComplete = async (
  page: ScoutPage,
  pageObjects: BackgroundSearchTestFixtures['pageObjects']
) => {
  const statusBadge = page.testSubj.locator('sessionManagementStatusLabel');

  await expect
    .poll(
      async () => {
        const status = await statusBadge.getAttribute('data-test-status');
        if (status === 'complete') return status;

        await pageObjects.backgroundSearch.closeFlyout();
        await pageObjects.discover.clickAppMenuItem(BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT);
        await pageObjects.backgroundSearch.waitForFlyout();
        return statusBadge.getAttribute('data-test-status');
      },
      { timeout: 60_000, intervals: [2_000] }
    )
    .toBe('complete');
};

const CLASSIC_BACKGROUND_SEARCH_NAME = 'Classic background search';
const ESQL_BACKGROUND_SEARCH_NAME = 'ESQL background search';
const SLOW_ESQL_QUERY = 'FROM kibana_sample_data_flights | LIMIT 1 | WHERE DELAY(5000ms)';

spaceTest.describe(
  'Discover background search restore into tabs',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      await scoutSpace.savedObjects.load(DISCOVER_DEFAULT_KBN_ARCHIVE);
      await apiServices.sampleData.install(FLIGHTS_SAMPLE_DATA_SET, scoutSpace.id);
      await scoutSpace.uiSettings.setDefaultIndex('logstash-*');
      await scoutSpace.uiSettings.set({ enableESQL: true });
      await scoutSpace.uiSettings.setDefaultTime(LOGSTASH_TIME_RANGE);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterEach(async ({ page, scoutSpace }) => {
      await deleteBackgroundSearchesAsBrowserUser(page, scoutSpace.id);
    });

    spaceTest.afterAll(async ({ apiServices, scoutSpace }) => {
      await apiServices.sampleData.remove(FLIGHTS_SAMPLE_DATA_SET, scoutSpace.id);
      await scoutSpace.uiSettings.unset('defaultIndex', 'enableESQL', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'restores a background search stored from a classic search into a new tab',
      async ({ page, pageObjects }) => {
        await spaceTest.step('store a named classic background search', async () => {
          await pageObjects.discover.goto({ queryMode: 'classic' });
          await pageObjects.discover.waitUntilSearchingHasFinished();
          await pageObjects.filterBar.addDslFilter(STALLING_DSL_FILTER);
          await pageObjects.backgroundSearch.sendToBackground();

          await pageObjects.discover.clickAppMenuItem(BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT);
          await pageObjects.backgroundSearch.waitForFlyout();
          await pageObjects.backgroundSearchManagement.renameRow(CLASSIC_BACKGROUND_SEARCH_NAME);
          await pageObjects.backgroundSearch.closeFlyout();
        });

        await spaceTest.step('restoring it opens a tab named after the search', async () => {
          await pageObjects.discover.clickAppMenuItem(BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT);
          await pageObjects.backgroundSearch.waitForFlyout();
          await reopenFlyoutUntilRowIsComplete(page, pageObjects);
          await pageObjects.backgroundSearchManagement.viewRow();
          await pageObjects.discover.waitUntilSearchingHasFinished();

          expect(await pageObjects.unifiedTabs.getSelectedTabLabel()).toBe(
            CLASSIC_BACKGROUND_SEARCH_NAME
          );
        });

        // Discover persists its tabs per user, so a restored tab left open would come back in
        // the next test and re-persist the background search it holds.
        await pageObjects.unifiedTabs.closeTab(1);
      }
    );

    spaceTest(
      'restores a background search stored from an ES|QL search and does not re-run it on tab switch',
      async ({ page, pageObjects }) => {
        await spaceTest.step('store a named ES|QL background search', async () => {
          await pageObjects.discover.goto({ queryMode: 'esql' });
          await pageObjects.discover.codeEditor.setCodeEditorValue(SLOW_ESQL_QUERY);
          await pageObjects.backgroundSearch.sendToBackground();

          await pageObjects.discover.clickAppMenuItem(BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT);
          await pageObjects.backgroundSearch.waitForFlyout();
          await pageObjects.backgroundSearchManagement.renameRow(ESQL_BACKGROUND_SEARCH_NAME);
          await pageObjects.backgroundSearch.closeFlyout();
        });

        await spaceTest.step('restoring it opens a tab named after the search', async () => {
          await pageObjects.discover.clickAppMenuItem(BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT);
          await pageObjects.backgroundSearch.waitForFlyout();
          await reopenFlyoutUntilRowIsComplete(page, pageObjects);
          await pageObjects.backgroundSearchManagement.viewRow();
          await pageObjects.discover.waitUntilSearchingHasFinished();

          expect(await pageObjects.unifiedTabs.getSelectedTabLabel()).toBe(
            ESQL_BACKGROUND_SEARCH_NAME
          );
        });

        await spaceTest.step('switching away and back does not re-run the search', async () => {
          await pageObjects.unifiedTabs.selectTab(0);
          await pageObjects.unifiedTabs.navigateToTabByName(ESQL_BACKGROUND_SEARCH_NAME);

          // The restored tab must come straight back as rendered. A re-run would drop
          // `data-render-complete` back to false while the 5s ES|QL DELAY replays.
          await expect(page.testSubj.locator('discoverDocTable')).toHaveAttribute(
            'data-render-complete',
            'true'
          );
        });
      }
    );
  }
);
