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
 * The FTR suite created a dedicated `another-space`; each Scout parallel worker already runs
 * in its own non-default space, so the roles below are simply scoped to `scoutSpace.id`.
 *
 * Migrated from
 * x-pack/platform/test/search_sessions_integration/tests/apps/discover/sessions_in_space.ts.
 *
 * Local-only: `STALLING_DSL_FILTER` relies on the `test-error-query` Elasticsearch module,
 * which is not present on Elastic Cloud.
 */

import type { KibanaRole } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  deleteAllBackgroundSearches,
  LOGSTASH_MONTH_TIME_RANGE,
  SESSION_IN_ANOTHER_SPACE_KBN_ARCHIVE,
  STALLING_DSL_FILTER,
} from '../fixtures';

const analystRole = (spaceId: string, discoverPrivileges: string[]): KibanaRole => ({
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['logstash-*'], privileges: ['all'] }],
  },
  kibana: [
    {
      base: [],
      feature: { discover: discoverPrivileges },
      spaces: [spaceId],
    },
  ],
});

spaceTest.describe(
  'Discover background search in a space',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      await scoutSpace.savedObjects.load(SESSION_IN_ANOTHER_SPACE_KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex('logstash-*');
      await scoutSpace.uiSettings.setDefaultTime(LOGSTASH_MONTH_TIME_RANGE);
    });

    spaceTest.afterAll(async ({ kbnClient, scoutSpace }) => {
      await deleteAllBackgroundSearches(kbnClient, scoutSpace.id);
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'saves and restores a background search with the full Discover privilege',
      async ({ browserAuth, pageObjects, scoutSpace }) => {
        await browserAuth.loginWithCustomRole(analystRole(scoutSpace.id, ['all']));

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
        await browserAuth.loginWithCustomRole(analystRole(scoutSpace.id, ['read']));

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
