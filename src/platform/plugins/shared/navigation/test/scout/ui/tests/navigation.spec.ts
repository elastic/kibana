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

test.describe('navigation', { tag: tags.serverless.security.complete }, () => {
  test('has security serverless side nav', async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.navigation.goToSecurity();
    await expect(pageObjects.navigation.getSidenav()).toBeVisible();
  });

  test('breadcrumbs reflect navigation state', async ({ page, pageObjects, browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.navigation.goToSecurity();

    await expect(page.testSubj.locator('breadcrumbs')).toBeVisible();
    await expect(pageObjects.navigation.getBreadcrumbByText('Get started')).toBeVisible();

    await pageObjects.collapsibleNav.clickNavItemByDeepLinkId('securitySolutionUI:alerts');
    await expect(pageObjects.navigation.getBreadcrumbByText('Alerts')).toBeVisible();

    await pageObjects.navigation.clickLogo();
    await expect(pageObjects.navigation.getBreadcrumbByText('Get started')).toBeVisible();
  });

  test('navigate using search', async ({ page, pageObjects, browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.navigation.goToSecurity();

    await page.testSubj.click('nav-search-reveal');
    await page.testSubj.fill('nav-search-input', 'security dashboards');
    await page
      .locator('[data-test-subj="nav-search-option"][url="/app/security/dashboards"]')
      .click();
    await page.testSubj.click('nav-search-conceal');

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
