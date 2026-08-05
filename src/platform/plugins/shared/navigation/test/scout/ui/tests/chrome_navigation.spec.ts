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
import { test } from '../fixtures';

/**
 * Solution-agnostic chrome navigation mechanics: side-nav rendering, breadcrumb
 * updates on navigation, and logo-click-to-home.
 */

const SPACE = {
  id: 'nav-mechanics-space',
  name: 'Nav Mechanics Space',
  disabledFeatures: [] as string[],
};

test.describe('chrome navigation mechanics', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ apiServices }) => {
    // Delete first so a leftover space from an interrupted prior run doesn't
    // fail creation with a 409 conflict.
    await apiServices.spaces.delete(SPACE.id).catch(() => {});
    await apiServices.spaces.create(SPACE);
    await apiServices.spaces.setSolutionView({ id: SPACE.id, solution: 'es' });
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('home:welcome:show', 'false');
    });
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.spaces.delete(SPACE.id).catch(() => {});
  });

  test('renders the side navigation and chrome layout', async ({
    browserAuth,
    pageObjects,
    kbnUrl,
    page,
  }) => {
    await browserAuth.loginAsViewer();
    await page.goto(kbnUrl.app('discover', { space: SPACE.id }));

    await expect(pageObjects.navigation.getSidenav()).toBeVisible();
    await expect(page.testSubj.locator('kbnChromeNav-primaryNavigation')).toBeVisible();
  });

  test('breadcrumbs update on navigation and the logo navigates home', async ({
    browserAuth,
    pageObjects,
    kbnUrl,
    page,
  }) => {
    await browserAuth.loginAsViewer();
    await page.goto(kbnUrl.app('discover', { space: SPACE.id }));

    await expect(page.testSubj.locator('breadcrumbs')).toBeVisible();
    await expect(pageObjects.navigation.getBreadcrumbByText('Discover')).toBeVisible();

    await pageObjects.collapsibleNav.clickNavItemByDeepLinkId('dashboards');
    await expect(pageObjects.navigation.getBreadcrumbByText('Dashboards')).toBeVisible();

    const dashboardsUrl = page.url();
    await pageObjects.navigation.clickLogo();
    await expect(page).not.toHaveURL(dashboardsUrl);
  });
});
