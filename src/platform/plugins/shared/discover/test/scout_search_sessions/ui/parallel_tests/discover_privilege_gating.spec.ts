/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Background searches in Discover inside a non-default Kibana space, and the Discover
 * privilege that gates them.
 *
 * Each parallel worker already runs in its own non-default space, so the roles below are
 * scoped to `scoutSpace.id`.
 *
 * Local-only: `STALLING_DSL_FILTER` relies on the `test-error-query` Elasticsearch module,
 * which is not present on Elastic Cloud.
 */

import { expect } from '@kbn/scout/ui';
import type { KibanaRole } from '@kbn/scout';
import {
  spaceTest,
  getSessionCookieHeader,
  LOGSTASH_MONTH_TIME_RANGE,
  SESSION_IN_ANOTHER_SPACE_KBN_ARCHIVE,
  STALLING_DSL_FILTER,
} from '@kbn/data-plugin/test/scout_search_sessions/ui/fixtures';

/** Role with full Discover access in one space, scoped to `logstash-*`. */
const discoverAllRole = (spaceId: string): KibanaRole => ({
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['logstash-*'], privileges: ['all'] }],
  },
  kibana: [{ base: [], feature: { discover: ['all'] }, spaces: [spaceId] }],
});

/** Role with read-only Discover access in one space, scoped to `logstash-*`. */
const discoverReadRole = (spaceId: string): KibanaRole => ({
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['logstash-*'], privileges: ['all'] }],
  },
  kibana: [{ base: [], feature: { discover: ['read'] }, spaces: [spaceId] }],
});

spaceTest.describe(
  'Discover background search privilege gating',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      await scoutSpace.savedObjects.load(SESSION_IN_ANOTHER_SPACE_KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex('logstash-*');
      await scoutSpace.uiSettings.setDefaultTime(LOGSTASH_MONTH_TIME_RANGE);
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
      'saves and restores a background search with the full Discover privilege',
      async ({ browserAuth, pageObjects, scoutSpace }) => {
        await browserAuth.loginWithCustomRole(discoverAllRole(scoutSpace.id));

        await pageObjects.discover.goto({ queryMode: 'classic' });
        // Fail loudly if the space archive did not provide the data view, rather than
        // silently continuing against an ad-hoc one.
        await pageObjects.discover.selectDataView('logstash-*', { createAdHocIfMissing: false });
        await pageObjects.discover.waitUntilSearchingHasFinished();

        await pageObjects.filterBar.addDslFilter(STALLING_DSL_FILTER);
        await pageObjects.backgroundSearch.sendToBackground();
        await pageObjects.backgroundSearch.openCompletedSearchFromToast();

        await pageObjects.discover.waitUntilSearchingHasFinished();
        await expect(pageObjects.backgroundSearch.errorOrWarningToasts).toHaveCount(0);
      }
    );

    spaceTest(
      'does not offer background search with read-only Discover privilege',
      async ({ browserAuth, pageObjects, scoutSpace }) => {
        await browserAuth.loginWithCustomRole(discoverReadRole(scoutSpace.id));

        await pageObjects.discover.goto({ queryMode: 'classic' });
        await pageObjects.discover.selectDataView('logstash-*', { createAdHocIfMissing: false });
        // Wait for results before asserting on an absence, so a hidden entrypoint means
        // "not offered" rather than "not yet drawn".
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await expect(pageObjects.backgroundSearch.flyoutEntrypoint).toBeHidden();
      }
    );
  }
);
