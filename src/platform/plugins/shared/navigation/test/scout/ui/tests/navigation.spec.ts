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

// Failing: See https://github.com/elastic/kibana/issues/266915
test.describe.skip('navigation', { tag: tags.serverless.security.complete }, () => {
  test('has security serverless side nav', async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.navigation.goToSecurity();
    await expect(pageObjects.navigation.getSidenav()).toBeVisible();
  });

  test('navigation state is reflected in the URL', async ({ page, pageObjects, browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.navigation.goToSecurity();

    await expect(page).toHaveURL(/\/app\/security\/get_started/);

    // Alerts is now nested inside the "Detections" panel opener; open it before clicking Alerts.
    await pageObjects.collapsibleNav.getNavItemById('securityGroup:alertDetections').click();
    await pageObjects.collapsibleNav.clickNavItemByDeepLinkId('securitySolutionUI:alerts');
    await expect(page).toHaveURL(/\/app\/security\/alerts/);

    await pageObjects.navigation.clickLogo();
    await expect(page).toHaveURL(/\/app\/security\/get_started/);
  });

  test('navigate using search', async ({ page, pageObjects, browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.navigation.goToSecurity();

    // The search trigger differs between classic (inline reveal) and chrome-next (header button);
    // accept either so the test works regardless of whether chrome-next is enabled.
    await page.testSubj
      .locator('chromeNextGlobalHeaderSearchButton')
      .or(page.testSubj.locator('nav-search-reveal'))
      .click();
    await page.testSubj.fill('nav-search-input', 'security dashboards');
    await page
      .locator('[data-test-subj="nav-search-option"][url="/app/security/dashboards"]')
      .click();
    // selecting a result closes the search and navigates

    await page.waitForURL(/app\/security\/dashboards/);
    expect(page.url()).toContain('app/security/dashboards');
  });

  test('shows cases in sidebar navigation', async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.navigation.goToSecurity();

    await expect(pageObjects.navigation.getSidenav()).toBeVisible();
    await pageObjects.collapsibleNav.openMoreMenu();
    await expect(
      pageObjects.collapsibleNav.getNavItemByDeepLinkId('securitySolutionUI:cases')
    ).toBeVisible();
  });

  test('navigates to cases app', async ({ page, pageObjects, browserAuth }) => {
    await expect(async () => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.navigation.goToSecurity();

      await pageObjects.collapsibleNav.openMoreMenu();
      await pageObjects.collapsibleNav.clickNavItemByDeepLinkId('securitySolutionUI:cases');

      expect(page.url()).toContain('/app/security/cases');
      await expect(page.testSubj.locator('cases-all-title')).toBeVisible();
    }).toPass({ timeout: 30000 });
  });

  test('navigates to maintenance windows', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.navigation.goToSecurity();

    await pageObjects.collapsibleNav.clickItem('stack_management');
    await pageObjects.collapsibleNav.clickItem('management:maintenanceWindows', {
      lowercase: false,
    });
    await expect(pageObjects.navigation.getBreadcrumbByText('Maintenance Windows')).toBeVisible();
  });

  test('opens panel on legacy management landing page', async ({
    page,
    pageObjects,
    browserAuth,
  }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.navigation.goToSecurity();

    await page.gotoApp('management');
    await expect(page.testSubj.locator('cards-navigation-page')).toBeVisible();
    await expect(pageObjects.collapsibleNav.getNavItemById('stack_management')).toBeVisible();
  });
});
