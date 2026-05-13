/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

test.describe('Welcome interstitial', { tag: ['@local-stateful-classic'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('is displayed on a fresh on-prem install', async ({ page, pageObjects }) => {
    await page.gotoApp('home');
    await expect(pageObjects.home.welcomeInterstitial).toBeVisible();
  });

  test('clicking "Explore on my own" redirects to home page', async ({ page, pageObjects }) => {
    await page.gotoApp('home');
    await expect(pageObjects.home.welcomeInterstitial).toBeVisible();

    await pageObjects.home.skipWelcomeButton.click();
    await expect(pageObjects.home.homeApp).toBeVisible();
  });
});
