/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Background searches on a dashboard inside a non-default Kibana space, and the
 * `store_search_session` privilege that gates them.
 *
 */

import type { KibanaRole } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  deleteAllBackgroundSearches,
  LOGSTASH_MONTH_TIME_RANGE,
  SESSION_IN_ANOTHER_SPACE_KBN_ARCHIVE,
} from '../fixtures';

const DELAYED_DASHBOARD_TITLE = 'A Dashboard in another space + Delay 5s';
const PLAIN_DASHBOARD_TITLE = 'A Dashboard in another space';

const analystRole = (spaceId: string, dashboardPrivileges: string[]): KibanaRole => ({
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['logstash-*'], privileges: ['all'] }],
  },
  kibana: [
    {
      base: [],
      feature: { dashboard: dashboardPrivileges },
      spaces: [spaceId],
    },
  ],
});

spaceTest.describe(
  'Dashboard background search in a space',
  { tag: '@local-stateful-classic' },
  () => {
    const dashboardIds = new Map<string, string>();

    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      const loadedObjects = await scoutSpace.savedObjects.load(
        SESSION_IN_ANOTHER_SPACE_KBN_ARCHIVE
      );
      for (const { type, title, id } of loadedObjects) {
        if (type === 'dashboard') dashboardIds.set(title, id);
      }
      await scoutSpace.uiSettings.setDefaultTime(LOGSTASH_MONTH_TIME_RANGE);
    });

    spaceTest.afterAll(async ({ kbnClient, scoutSpace }) => {
      await deleteAllBackgroundSearches(kbnClient, scoutSpace.id);
      await scoutSpace.uiSettings.unset('timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'saves and restores a background search with store_search_session',
      async ({ browserAuth, page, pageObjects, scoutSpace }) => {
        await browserAuth.loginWithCustomRole(
          analystRole(scoutSpace.id, ['minimal_read', 'store_search_session'])
        );

        const dashboardId = dashboardIds.get(DELAYED_DASHBOARD_TITLE);
        expect(dashboardId, `Dashboard "${DELAYED_DASHBOARD_TITLE}" should be loaded`).toBeTruthy();

        await pageObjects.dashboard.openDashboardWithId(dashboardId!);
        await pageObjects.dashboard.waitForRenderComplete();

        await pageObjects.backgroundSearch.sendToBackground({ isSubmitButton: true });
        await pageObjects.backgroundSearch.openCompletedSearchFromToast();

        await pageObjects.dashboard.waitForRenderComplete();
        await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
        await expect(pageObjects.backgroundSearch.errorOrWarningToasts).toHaveCount(0);
      }
    );

    spaceTest(
      'does not offer background search without the store_search_session privilege',
      async ({ browserAuth, pageObjects, scoutSpace }) => {
        await browserAuth.loginWithCustomRole(analystRole(scoutSpace.id, ['minimal_read']));

        const dashboardId = dashboardIds.get(PLAIN_DASHBOARD_TITLE);
        expect(dashboardId, `Dashboard "${PLAIN_DASHBOARD_TITLE}" should be loaded`).toBeTruthy();

        await pageObjects.dashboard.openDashboardWithId(dashboardId!);
        // Wait for the dashboard to finish rendering before asserting on an absence, so a
        // hidden entrypoint means "not offered" rather than "not yet drawn".
        await pageObjects.dashboard.waitForRenderComplete();
        await expect(pageObjects.backgroundSearch.flyoutEntrypoint).toBeHidden();
      }
    );
  }
);
