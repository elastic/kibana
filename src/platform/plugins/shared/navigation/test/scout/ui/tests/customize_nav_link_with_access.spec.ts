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
  }
);
