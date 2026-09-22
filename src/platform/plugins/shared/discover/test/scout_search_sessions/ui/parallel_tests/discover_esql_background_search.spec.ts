/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Sending a running Discover ES|QL search to the background.
 */

import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  getSessionCookieHeader,
  BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT,
  FLIGHTS_SAMPLE_DATA_SET,
} from '@kbn/data-plugin/test/scout_search_sessions/ui/fixtures';

// `DELAY` stalls each row long enough for the search to still be running when the test
// clicks "Send to background".
const SLOW_ESQL_QUERY = 'FROM kibana_sample_data_flights | LIMIT 10 | WHERE DELAY(1000ms)';

spaceTest.describe(
  'Discover ES|QL mode background search',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      await apiServices.sampleData.install(FLIGHTS_SAMPLE_DATA_SET, scoutSpace.id);
      await scoutSpace.uiSettings.set({ enableESQL: true });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
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

    spaceTest(
      'stores a running search and surfaces it in the background search flyout',
      async ({ pageObjects }) => {
        await pageObjects.discover.goto({ queryMode: 'esql' });
        await pageObjects.discover.waitUntilTabIsLoaded();
        await pageObjects.discover.codeEditor.setCodeEditorValue(SLOW_ESQL_QUERY);

        await pageObjects.backgroundSearch.sendToBackground();

        // `clickAppMenuItem` handles the entrypoint being collapsed into the overflow popover,
        // which is where Discover puts it in ES|QL mode.
        await pageObjects.discover.clickAppMenuItem(BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT);
        await pageObjects.backgroundSearch.waitForFlyout();
        await expect(pageObjects.backgroundSearch.managementTable).toBeVisible();
        await expect(pageObjects.backgroundSearch.errorOrWarningToasts).toHaveCount(0);
      }
    );
  }
);
