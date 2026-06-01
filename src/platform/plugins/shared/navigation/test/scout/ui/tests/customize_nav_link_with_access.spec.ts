/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import type { KibanaRole } from '@kbn/scout';
import {
  NAV_CUSTOMIZATION_STORAGE_KEY,
  NAV_CALLOUT_DISMISSED_STORAGE_KEY,
} from '../../../../common';
import { test } from '../fixtures';

// Internal-route headers required by Kibana for non-public APIs.
const INTERNAL_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
} as const;

/**
 * Scenario A — User with full Kibana access to a custom es-solution space.
 *
 * userStorage.isAvailable() === true → "Customize navigation" link is visible in the user menu
 * and the modal opens when clicked.
 */

const SPACE_A = {
  id: 'nav-customization-space-a',
  name: 'Nav Customization Space A',
  disabledFeatures: [] as string[],
};

// Minimal (read-only) privileges in SPACE_A:
// - discover/dashboard `read` so those nav items are visible and SAML login
//   activates a user profile (so userStorage.isAvailable() is true and the
//   "Customize navigation" link renders).
// - Write access to the `user-storage` saved object type is only granted by a
//   feature's `all` privilege, so this read-only user CANNOT persist a
//   customization: the save (PUT /internal/user_storage/{key}) fails and the UI
//   surfaces an error toast. That behavior is what the test below verifies.
// - No ES index privileges are needed because the test stays on the home app.
const MINIMAL_NAV_ROLE: KibanaRole = {
  elasticsearch: { cluster: [] },
  kibana: [
    {
      base: [],
      feature: { discover: ['read'], dashboard: ['read'] },
      spaces: [SPACE_A.id],
    },
  ],
};

test.describe(
  'Scenario A — Customize navigation link is visible in an es-solution space',
  { tag: tags.stateful.classic },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      await apiServices.spaces.create(SPACE_A);
      await apiServices.spaces.setSolutionView({ id: SPACE_A.id, solution: 'es' });
    });

    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('home:welcome:show', 'false');
      });
    });

    // Reset the per-user navigation customization after each test so saved
    // moves/hidden items (and the dismissed callout) don't leak between tests.
    // userStorage records are keyed by the logged-in user's profile id, so the
    // delete must reuse the browser session's cookie via `page.request` rather
    // than a superuser kbnClient. The customization key is space-scoped; the
    // callout key is global.
    test.afterEach(async ({ page, kbnUrl }) => {
      await page.request.delete(
        kbnUrl.get(`s/${SPACE_A.id}/internal/user_storage/${NAV_CUSTOMIZATION_STORAGE_KEY}`),
        { headers: INTERNAL_HEADERS }
      );
      await page.request.delete(
        kbnUrl.get(`internal/user_storage/${NAV_CALLOUT_DISMISSED_STORAGE_KEY}`),
        { headers: INTERNAL_HEADERS }
      );
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.spaces.delete(SPACE_A.id).catch(() => {});
    });

    test('shows the "Customize navigation" link in the user menu', async ({
      browserAuth,
      pageObjects,
      kbnUrl,
      page,
    }) => {
      await browserAuth.loginAsAdmin();
      await page.goto(kbnUrl.app('home', { space: SPACE_A.id }));
      await page.testSubj.locator('kbnChromeLayoutNavigation').waitFor({ state: 'visible' });

      await pageObjects.navigation.openUserMenu();

      await expect(pageObjects.navigation.getCustomizeNavLink()).toBeVisible();
    });

    test('opens the customize navigation modal when the link is clicked', async ({
      browserAuth,
      pageObjects,
      kbnUrl,
      page,
    }) => {
      await browserAuth.loginAsAdmin();
      await page.goto(kbnUrl.app('home', { space: SPACE_A.id }));
      await page.testSubj.locator('kbnChromeLayoutNavigation').waitFor({ state: 'visible' });

      await pageObjects.navigation.openUserMenu();
      await pageObjects.navigation.getCustomizeNavLink().click();

      await expect(pageObjects.navigation.getCustomizeNavModal()).toBeVisible();
    });

    /**
     * Graceful-degradation test — a read-only user can open the customize modal
     * (the link is gated on userStorage read availability) but cannot persist a
     * change, because write access to the `user-storage` saved object is only
     * granted by a feature's `all` privilege. When the save fails, the UI must
     * surface an error toast rather than failing silently.
     *
     * 1. Hide Discover via the modal and apply.
     * 2. The save (PUT /internal/user_storage/{key}) fails server-side.
     * 3. Assert: an error toast titled "Unable to save navigation customization"
     *    appears.
     */
    test('surfaces an error toast when a read-only user cannot persist a customization', async ({
      browserAuth,
      pageObjects,
      kbnUrl,
      page,
    }) => {
      const nav = pageObjects.navigation;

      await browserAuth.loginWithCustomRole(MINIMAL_NAV_ROLE);
      await page.goto(kbnUrl.app('home', { space: SPACE_A.id }));
      await page.testSubj.locator('kbnChromeNav-primaryNavigation').waitFor({ state: 'visible' });

      await nav.openCustomizeNavModal();
      await nav.toggleItemVisibility('discover');
      await nav.applyCustomization();

      // The read-only user lacks write access to user-storage, so the save
      // fails and an error toast is shown.
      await expect(page.testSubj.locator('globalToastList')).toContainText(
        'Unable to save navigation customization'
      );
    });
  }
);
