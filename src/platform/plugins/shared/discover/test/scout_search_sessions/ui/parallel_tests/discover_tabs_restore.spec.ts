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

import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  getSessionCookieHeader,
  BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT,
  DISCOVER_DEFAULT_KBN_ARCHIVE,
  FLIGHTS_SAMPLE_DATA_SET,
  LOGSTASH_TIME_RANGE,
  STALLING_DSL_FILTER,
} from '@kbn/data-plugin/test/scout_search_sessions/ui/fixtures';

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

    spaceTest.afterEach(async ({ apiServices, page, pageObjects, scoutSpace }) => {
      await apiServices.backgroundSearch.cleanup.deleteAll({
        cookieHeader: await getSessionCookieHeader(page),
        spaceId: scoutSpace.id,
      });

      // Discover persists its tabs per user, so a restored tab left open comes back in the next
      // test and re-persists the background search it holds. This has to run in the hook rather
      // than the test body so it still happens when a test fails mid-restore.
      // Closed back-to-front: `closeTab` waits on a positional locator, so closing anything but
      // the last tab leaves that position resolving to the tab that shifted into it.
      const openTabs = await pageObjects.unifiedTabs.getTabLabels();
      for (let i = openTabs.length - 1; i >= 1; i--) {
        await pageObjects.unifiedTabs.closeTab(i);
      }
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'enableESQL', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'restores a background search stored from a classic search into a new tab',
      async ({ pageObjects }) => {
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
          // Completion is polled from the management page rather than the flyout: the flyout
          // hides the refresh button and does not auto-refresh, so it cannot be re-fetched.
          await pageObjects.backgroundSearchManagement.goTo();
          await pageObjects.backgroundSearchManagement.waitForRowStatus('complete');
          await pageObjects.backgroundSearchManagement.viewRow();
          await pageObjects.discover.waitUntilSearchingHasFinished();

          expect(await pageObjects.unifiedTabs.getSelectedTabLabel()).toBe(
            CLASSIC_BACKGROUND_SEARCH_NAME
          );
        });
      }
    );

    spaceTest(
      'restores a background search stored from an ES|QL search and does not re-run it on tab switch',
      async ({ page, pageObjects }) => {
        await spaceTest.step('store a named ES|QL background search', async () => {
          await pageObjects.discover.goto({ queryMode: 'esql' });
          await pageObjects.discover.waitUntilTabIsLoaded();
          await pageObjects.discover.codeEditor.setCodeEditorValue(SLOW_ESQL_QUERY);
          await pageObjects.backgroundSearch.sendToBackground();

          await pageObjects.discover.clickAppMenuItem(BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT);
          await pageObjects.backgroundSearch.waitForFlyout();
          await pageObjects.backgroundSearchManagement.renameRow(ESQL_BACKGROUND_SEARCH_NAME);
          await pageObjects.backgroundSearch.closeFlyout();
        });

        await spaceTest.step('restoring it opens a tab named after the search', async () => {
          // Completion is polled from the management page rather than the flyout: the flyout
          // hides the refresh button and does not auto-refresh, so it cannot be re-fetched.
          await pageObjects.backgroundSearchManagement.goTo();
          await pageObjects.backgroundSearchManagement.waitForRowStatus('complete');
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
          // `data-table-loaded` back to false while the 5s ES|QL DELAY replays.
          await expect(page.testSubj.locator('discoverDocTable')).toHaveAttribute(
            'data-table-loaded',
            'true'
          );
        });
      }
    );

    spaceTest(
      'restoring a background search does not re-run the query in an unrelated tab',
      async ({ page, pageObjects }) => {
        await spaceTest.step('store a background search', async () => {
          await pageObjects.discover.goto({ queryMode: 'esql' });
          await pageObjects.discover.waitUntilTabIsLoaded();
          await pageObjects.discover.codeEditor.setCodeEditorValue(SLOW_ESQL_QUERY);
          await pageObjects.backgroundSearch.sendToBackground();
        });

        await spaceTest.step('run the same slow query in a second tab', async () => {
          await pageObjects.unifiedTabs.createNewTab();
          await pageObjects.discover.selectTextBaseLang();
          await pageObjects.discover.waitUntilTabIsLoaded();
          await pageObjects.discover.codeEditor.setCodeEditorValue(SLOW_ESQL_QUERY);
          await pageObjects.discover.submitQuery();
          await pageObjects.discover.waitUntilSearchingHasFinished();
        });

        await spaceTest.step('restore the background search into a third tab', async () => {
          await pageObjects.backgroundSearchManagement.goTo();
          await pageObjects.backgroundSearchManagement.waitForRowStatus('complete');
          await pageObjects.backgroundSearchManagement.viewRow();
          await pageObjects.discover.waitUntilSearchingHasFinished();
        });

        await spaceTest.step('the second tab is still rendered', async () => {
          // Restoring elsewhere must not invalidate an unrelated tab: a re-run would drop
          // `data-table-loaded` back to false while the 5s ES|QL DELAY replays.
          await pageObjects.unifiedTabs.selectTab(1);

          await expect(page.testSubj.locator('discoverDocTable')).toHaveAttribute(
            'data-table-loaded',
            'true'
          );
        });
      }
    );
  }
);
