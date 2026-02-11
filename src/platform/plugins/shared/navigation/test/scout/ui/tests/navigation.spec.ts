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
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.navigation.goToSecurity();
  });

  test('has security serverless side nav', async ({ pageObjects }) => {
    await expect(pageObjects.navigation.getSidenav()).toBeVisible();
  });

  test('breadcrumbs reflect navigation state', async ({ page, pageObjects }) => {
    await expect(page.testSubj.locator('breadcrumbs')).toBeVisible();
    await expect(pageObjects.navigation.getBreadcrumbByText('Get started')).toBeVisible();

    await page.testSubj.click('~nav-item-deepLinkId-securitySolutionUI:alerts');
    await expect(pageObjects.navigation.getBreadcrumbByText('Alerts')).toBeVisible();

    await pageObjects.navigation.clickLogo();
    await expect(pageObjects.navigation.getBreadcrumbByText('Get started')).toBeVisible();
  });

  test('navigate using search', async ({ page }) => {
    await page.testSubj.click('nav-search-reveal');
    await page.testSubj.fill('nav-search-input', 'security dashboards');
    await page.testSubj.waitForSelector('nav-search-option');
    const options = await page.testSubj.locator('nav-search-option').all();
    await options[0].click();
    await page.testSubj.click('nav-search-conceal');

    await page.waitForURL(/app\/security\/dashboards/);
    expect(page.url()).toContain('app/security/dashboards');
  });

  test('shows cases in sidebar navigation', async ({ page, pageObjects }) => {
    await expect(pageObjects.navigation.getSidenav()).toBeVisible();
    await page.testSubj.click('kbnChromeNav-moreMenuTrigger');
    await expect(
      page.testSubj.locator('~nav-item-deepLinkId-securitySolutionUI:cases')
    ).toBeVisible();
  });

  test('navigates to cases app', async ({ page, pageObjects }) => {
    await expect(async () => {
      await pageObjects.navigation.goToSecurity();
      await page.testSubj.click('kbnChromeNav-moreMenuTrigger');
      await page.testSubj.click('~nav-item-deepLinkId-securitySolutionUI:cases');

      expect(page.url()).toContain('/app/security/cases');
      await expect(page.testSubj.locator('cases-all-title')).toBeVisible();
    }).toPass({ timeout: 30000 });
  });

  test('navigates to maintenance windows', async ({ page, browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.navigation.goToSecurity();
    await page.testSubj.click('~nav-item-id-stack_management');
    await page.testSubj.click('~nav-item-id-management:maintenanceWindows');
    await expect(pageObjects.navigation.getBreadcrumbByText('Maintenance Windows')).toBeVisible();
  });

  test('renders a feedback callout', async ({ page, pageObjects }) => {
    await page.evaluate(() => {
      localStorage.removeItem('sideNavigationFeedback');
    });
    await page.reload();

    await expect(pageObjects.navigation.getFeedbackCallout()).toBeVisible();
    await pageObjects.navigation.getFeedbackDismissButton().click();
    await expect(pageObjects.navigation.getFeedbackButtonSurveyLink()).toBeVisible();

    await page.reload();
    await expect(pageObjects.navigation.getFeedbackButtonSurveyLink()).toBeVisible();
  });

  test('opens panel on legacy management landing page', async ({ page }) => {
    await page.gotoApp('management');
    await expect(page.testSubj.locator('cards-navigation-page')).toBeVisible();
    await expect(page.testSubj.locator('~nav-item-id-stack_management')).toBeVisible();
  });
});
