/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Migrated from: x-pack/platform/test/search_sessions_integration/tests/apps/management/search_sessions/sessions_management_permissions.ts
 * FTR config:    x-pack/platform/test/search_sessions_integration/config.management.ts
 *
 * Tests that the Background Search management UI is gated correctly behind the
 * `store_search_session` Kibana privilege:
 *
 * - Without `store_search_session`: "Stack Management" must be absent from the nav.
 * - With `store_search_session`: "Stack Management" must appear in the nav and the
 *   background search section must be accessible.
 *
 * Each test calls loginWithCustomRole() independently — no shared state is needed.
 * Workers use different, auto-named custom roles (custom_role_worker_N) so there
 * is no role-name collision when running in parallel.
 */

import { tags } from '@kbn/scout';
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
  { tag: [...tags.stateful.classic] },
  () => {
    spaceTest(
      'management is NOT accessible to users without store_search_session privilege',
      async ({ page, browserAuth, pageObjects }) => {
        await browserAuth.loginWithCustomRole(roleDashboardReadOnly);

        await page.gotoApp('dashboards');

        // Wait for Kibana to fully bootstrap before reading nav links.
        // Under parallel load the page may take longer than the default 10 s action timeout.
        await expect(page.testSubj.locator('toggleNavButton')).toBeVisible({ timeout: 30_000 });

        const navLinks = await pageObjects.collapsibleNav.getNavLinks();
        expect(navLinks).not.toContain('Stack Management');
      }
    );

    spaceTest(
      'management IS accessible to users with store_search_session privilege',
      async ({ page, browserAuth, pageObjects }) => {
        await browserAuth.loginWithCustomRole(roleDashboardWithBackgroundSearch);

        await page.gotoApp('management');

        await expect(page.testSubj.locator('toggleNavButton')).toBeVisible({ timeout: 30_000 });

        const navLinks = await pageObjects.collapsibleNav.getNavLinks();
        expect(navLinks).toContain('Stack Management');

        // Mirror the original FTR assertion (managementMenu had exactly one section
        // `{ kibana: ['search_sessions'] }`): with only `store_search_session`, the
        // management side nav must expose Background Search and nothing else.
        const managementAppLinks = page.testSubj
          .locator('mgtSideBarNav')
          .locator('a.euiSideNavItemButton');
        await expect(managementAppLinks).toHaveCount(1);
        await expect(managementAppLinks).toHaveAttribute('data-test-subj', 'search_sessions');
        await expect(managementAppLinks).toContainText('Background Search');
      }
    );
  }
);
