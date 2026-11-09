/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Sending a running Discover (classic) search to the background.
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
  LOGSTASH_TIME_RANGE,
  STALLING_DSL_FILTER,
} from '@kbn/data-plugin/test/scout_search_sessions/ui/fixtures';

spaceTest.describe(
  'Discover classic mode background search',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      // Defensive: a retry in the same worker space would otherwise duplicate saved objects.
      await scoutSpace.savedObjects.cleanStandardList();
      await scoutSpace.savedObjects.load(DISCOVER_DEFAULT_KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex('logstash-*');
      // The stalling filter only slows the search down if shards are actually searched. With a
      // recent time range the can-match phase prunes every logstash-* shard, the query returns
      // instantly, and there is no in-flight search to send to the background.
      await scoutSpace.uiSettings.setDefaultTime(LOGSTASH_TIME_RANGE);
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
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'stores a running search and surfaces it in the background search flyout',
      async ({ pageObjects }) => {
        await pageObjects.discover.goto({ queryMode: 'classic' });
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.filterBar.addDslFilter(STALLING_DSL_FILTER);

        await pageObjects.backgroundSearch.sendToBackground();

        // Raised above the default: covers Elasticsearch finishing the stalled search.
        await expect(pageObjects.backgroundSearch.completedToastLink).toBeVisible({
          timeout: 30_000,
        });

        // Discover collapses the entrypoint into the app menu overflow popover in both classic
        // and ES|QL mode; `clickAppMenuItem` handles expanding it.
        await pageObjects.discover.clickAppMenuItem(BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT);
        await pageObjects.backgroundSearch.waitForFlyout();
        await expect(pageObjects.backgroundSearch.managementTable).toBeVisible();
        await expect(pageObjects.backgroundSearch.errorOrWarningToasts).toHaveCount(0);
      }
    );
  }
);
