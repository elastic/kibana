/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Storing a background search from a Discover tab that was created mid-session, including
 * after switching back to an earlier tab.
 */

import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  getSessionCookieHeader,
  BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT,
  FLIGHTS_SAMPLE_DATA_SET,
} from '@kbn/data-plugin/test/scout_search_sessions/ui/fixtures';

const SLOW_ESQL_QUERY = 'FROM kibana_sample_data_flights | LIMIT 1 | WHERE DELAY(5000ms)';

spaceTest.describe(
  'Discover tabs storing a background search',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      await apiServices.sampleData.install(FLIGHTS_SAMPLE_DATA_SET, scoutSpace.id);
      await scoutSpace.uiSettings.set({ enableESQL: true });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.discover.goto({ queryMode: 'esql' });
    });

    spaceTest.afterEach(async ({ apiServices, page, scoutSpace }) => {
      await apiServices.backgroundSearch.cleanup.deleteAll({
        cookieHeader: await getSessionCookieHeader(page),
        spaceId: scoutSpace.id,
      });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('enableESQL');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('stores a background search from a newly created tab', async ({ pageObjects }) => {
      await pageObjects.unifiedTabs.createNewTab();
      await pageObjects.discover.selectTextBaseLang();
      await pageObjects.discover.waitUntilTabIsLoaded();
      await pageObjects.discover.codeEditor.setCodeEditorValue(SLOW_ESQL_QUERY);

      await pageObjects.backgroundSearch.sendToBackground();

      await pageObjects.discover.clickAppMenuItem(BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT);
      await pageObjects.backgroundSearch.waitForFlyout();
      await expect(pageObjects.backgroundSearch.managementTable).toBeVisible();
      await expect(pageObjects.backgroundSearch.errorOrWarningToasts).toHaveCount(0);
    });

    spaceTest(
      'stores a background search after switching back to an earlier tab',
      async ({ pageObjects }) => {
        await pageObjects.unifiedTabs.createNewTab();
        await pageObjects.discover.selectTextBaseLang();
        await pageObjects.discover.waitUntilTabIsLoaded();
        await pageObjects.discover.codeEditor.setCodeEditorValue(SLOW_ESQL_QUERY);

        // A third tab, then back to the one holding the slow query.
        await pageObjects.unifiedTabs.createNewTab();
        await pageObjects.unifiedTabs.selectTab(1);

        await pageObjects.backgroundSearch.sendToBackground();

        await pageObjects.discover.clickAppMenuItem(BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT);
        await pageObjects.backgroundSearch.waitForFlyout();
        await expect(pageObjects.backgroundSearch.managementTable).toBeVisible();
        await expect(pageObjects.backgroundSearch.errorOrWarningToasts).toHaveCount(0);
      }
    );
  }
);
