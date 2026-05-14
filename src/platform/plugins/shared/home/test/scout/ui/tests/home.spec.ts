/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

test.describe('Home page', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('home:welcome:show', 'false');
    });
    await browserAuth.loginAsViewer();
  });

  test('clicking on kibana logo should take you to home page', async ({ page }) => {
    await page.gotoApp('management');
    await page.testSubj.locator('logo').click();
    await expect(page).toHaveURL(/\/app\/home/);
  });

  test('home page should render breadcrumbs', async ({ page, pageObjects }) => {
    await pageObjects.home.goto();

    const breadcrumb = page.testSubj.locator('breadcrumb first last');
    await expect(breadcrumb).toContainText('Home');
  });

  test('home tutorials directory page should render breadcrumbs', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get('/app/home#/tutorial_directory/sampleData'));

    const firstBreadcrumb = page.testSubj.locator('breadcrumb first');
    const lastBreadcrumb = page.testSubj.locator('breadcrumb last');

    await expect(firstBreadcrumb).toContainText('Integrations');
    await expect(lastBreadcrumb).toContainText('Sample data');
  });

  test('home tutorials should render correct breadcrumbs', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get('/app/home#/tutorial/apm'));

    const firstBreadcrumb = page.testSubj.locator('breadcrumb first');
    const lastBreadcrumb = page.testSubj.locator('breadcrumb last');

    await expect(firstBreadcrumb).toContainText('Integrations');
    await expect(lastBreadcrumb).toContainText('APM');
  });
});
