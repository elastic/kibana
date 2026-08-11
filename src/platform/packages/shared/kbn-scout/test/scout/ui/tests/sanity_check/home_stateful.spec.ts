/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test, tags } from '../../../../../src/playwright';
import { expect } from '../../../../../ui';

test.describe(
  `Stateful deployment`,
  {
    tag: [...tags.stateful.classic],
  },
  () => {
    test(`should successfully load home page`, async ({ browserAuth, page }) => {
      const LOADING_TIMEOUT = 20_000;
      await browserAuth.loginAsAdmin();
      await page.addInitScript(() => {
        window.localStorage.setItem('home:welcome:show', 'false');
      });
      await page.gotoApp('home');

      await expect(
        page.testSubj.locator('headerGlobalNav'),
        'Expected layout header to be visible'
      ).toBeVisible({
        timeout: LOADING_TIMEOUT,
      });

      await page.testSubj.locator('toggleNavButton').click();
      await expect(
        page.testSubj.locator('collapsibleNavGroup-kibana'),
        'Expected left-side navigation to be visible'
      ).toBeVisible({
        timeout: LOADING_TIMEOUT,
      });

      await expect(
        page.testSubj.locator('kbnChromeLayoutApplication'),
        'Expected main app layout to be visible'
      ).toBeVisible({
        timeout: LOADING_TIMEOUT,
      });

      await expect(
        page.testSubj.locator('userMenuButton'),
        'Expected user menu button to be visible'
      ).toBeVisible();
    });
  }
);
