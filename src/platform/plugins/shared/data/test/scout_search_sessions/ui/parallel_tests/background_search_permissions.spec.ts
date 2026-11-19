/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 *
 * Tests that the Background Search management UI is gated correctly behind the
 * `store_search_session` Kibana privilege
 */

import type { KibanaRole } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

/**
 * Role with dashboard:read only — no background search management privilege.
 * Stack Management must NOT appear in the nav for this user.
 */
const roleDashboardReadOnly: KibanaRole = {
  elasticsearch: { cluster: [] },
  kibana: [
    {
      base: [],
      feature: { dashboard: ['read'] },
      spaces: ['*'],
    },
  ],
};

/**
 * Role with dashboard:read + store_search_session — grants access to the
 * Background Search management page.
 */
const roleDashboardWithBackgroundSearch: KibanaRole = {
  elasticsearch: { cluster: [] },
  kibana: [
    {
      base: [],
      feature: { dashboard: ['read', 'store_search_session'] },
      spaces: ['*'],
    },
  ],
};

spaceTest.describe(
  'Background Search management — permissions',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest(
      'management is NOT accessible to users without store_search_session privilege',
      async ({ page, browserAuth }) => {
        await browserAuth.loginWithCustomRole(roleDashboardReadOnly);
        await page.gotoApp('management');
        await expect(page.testSubj.locator('appNotFoundPageContent')).toBeVisible();
      }
    );

    spaceTest(
      'management IS accessible to users with store_search_session privilege',
      async ({ page, browserAuth }) => {
        await browserAuth.loginWithCustomRole(roleDashboardWithBackgroundSearch);
        await page.gotoApp('management');
        const searchSessionsLink = page.testSubj.locator('search_sessions');
        // The management app can take longer than the default 10s auto-wait to
        // cold-boot under parallel load, so wait on the nav item itself with the
        // readiness timeout the rest of this suite uses.
        await expect(searchSessionsLink).toContainText('Background Search', { timeout: 30_000 });
      }
    );
  }
);
