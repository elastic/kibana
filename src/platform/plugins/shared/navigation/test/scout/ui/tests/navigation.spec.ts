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
import { visualTest as test } from '../fixtures';

test.describe('navigation', { tag: tags.serverless.security.complete }, () => {
  test('has security serverless side nav', async ({ pageObjects, browserAuth }) => {
    await test.step('security home shows the serverless side navigation', async () => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.navigation.goToSecurity();
      await expect(pageObjects.navigation.getSidenav()).toBeVisible();
    });
  });

  test('breadcrumbs reflect navigation state', async ({ page, pageObjects, browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.navigation.goToSecurity();

    await test.step('security home shows the get started breadcrumb', async () => {
      await expect(page.testSubj.locator('breadcrumbs')).toBeVisible();
      await expect(pageObjects.navigation.getBreadcrumbByText('Get started')).toBeVisible();
    });

    await pageObjects.collapsibleNav.clickNavItemByDeepLinkId('securitySolutionUI:alerts');

    await test.step('alerts navigation updates the breadcrumb trail', async () => {
      await expect(pageObjects.navigation.getBreadcrumbByText('Alerts')).toBeVisible();
    });

    await pageObjects.navigation.clickLogo();

    await test.step('clicking the logo restores the get started breadcrumb', async () => {
      await expect(pageObjects.navigation.getBreadcrumbByText('Get started')).toBeVisible();
    });
  });

  test('navigate using search', async ({ page, pageObjects, browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.navigation.goToSecurity();

    const dashboardsOption = page.locator(
      '[data-test-subj="nav-search-option"][url="/app/security/dashboards"]'
    );

    await test.step('nav search shows the security dashboards destination', async () => {
      await page.testSubj.click('nav-search-reveal');
      await page.testSubj.fill('nav-search-input', 'security dashboards');
      await expect(dashboardsOption).toBeVisible();
    });

    await dashboardsOption.click();
    await page.testSubj.click('nav-search-conceal');

    await page.waitForURL(/app\/security\/dashboards/);

    await test.step('nav search opens the security dashboards page', async () => {
      expect(page.url()).toContain('app/security/dashboards');
      await expect(pageObjects.navigation.getBreadcrumbByText('Dashboards')).toBeVisible();
    });
  });

  test('shows cases in sidebar navigation', async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.navigation.goToSecurity();

    await pageObjects.collapsibleNav.openMoreMenu();

    await test.step('the more menu shows the cases navigation entry', async () => {
      await expect(pageObjects.navigation.getSidenav()).toBeVisible();
      await expect(
        pageObjects.collapsibleNav.getNavItemByDeepLinkId('securitySolutionUI:cases')
      ).toBeVisible();
    });
  });

  test('navigates to cases app', async ({ page, pageObjects, browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.navigation.goToSecurity();

    await pageObjects.collapsibleNav.openMoreMenu();
    await pageObjects.collapsibleNav.clickNavItemByDeepLinkId('securitySolutionUI:cases');
    await page.waitForURL(/\/app\/security\/cases/);

    await test.step('cases navigation opens the cases application', async () => {
      expect(page.url()).toContain('/app/security/cases');
      await expect(page.testSubj.locator('cases-all-title')).toBeVisible();
    });
  });

  test('navigates to maintenance windows', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.navigation.goToSecurity();

    await pageObjects.collapsibleNav.clickItem('stack_management');
    await pageObjects.collapsibleNav.clickItem('management:maintenanceWindows', {
      lowercase: false,
    });

    await test.step('stack management opens the maintenance windows page', async () => {
      await expect(pageObjects.navigation.getBreadcrumbByText('Maintenance Windows')).toBeVisible();
    });
  });

  test('opens panel on legacy management landing page', async ({
    page,
    pageObjects,
    browserAuth,
  }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.navigation.goToSecurity();

    await page.gotoApp('management');

    await test.step('legacy management shows the cards navigation page', async () => {
      await expect(page.testSubj.locator('cards-navigation-page')).toBeVisible();
      await expect(pageObjects.collapsibleNav.getNavItemById('stack_management')).toBeVisible();
    });
  });
});
