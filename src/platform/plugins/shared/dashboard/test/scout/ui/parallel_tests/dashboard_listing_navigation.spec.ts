/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { DASHBOARD_DEFAULT_INDEX_TITLE, DASHBOARD_SAVED_SEARCH_ARCHIVE } from '../constants';

const DASHBOARD_NAME = 'Navigation Test Dashboard';

spaceTest.describe('Dashboard listing navigation', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await scoutSpace.savedObjects.load(DASHBOARD_SAVED_SEARCH_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(DASHBOARD_DEFAULT_INDEX_TITLE);
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'clicking create new dashboard and navigating back to listing page',
    async ({ page, pageObjects }) => {
      await spaceTest.step(
        'clicking create new dashboard button navigates to the editor',
        async () => {
          await pageObjects.dashboard.goto();
          await page.testSubj.click('newItemButton');
          await expect(page.testSubj.locator('dashboardAddTopNavButton')).toBeVisible({
            timeout: 20_000,
          });
        }
      );

      await spaceTest.step('navigating back to listing page from a new dashboard', async () => {
        await page.goBack();
        await expect(page.testSubj.locator('newItemButton')).toBeVisible();
      });
    }
  );

  spaceTest(
    'saving a dashboard and returning to the listing page shows it',
    async ({ page, pageObjects }) => {
      await pageObjects.dashboard.goto();
      await page.testSubj.click('newItemButton');
      await expect(page.testSubj.locator('dashboardAddTopNavButton')).toBeVisible({
        timeout: 20_000,
      });
      await pageObjects.dashboard.saveDashboard(DASHBOARD_NAME);
      await page.goBack();
      await expect(
        page.testSubj.locator(`dashboardListingTitleLink-${DASHBOARD_NAME.split(' ').join('-')}`)
      ).toBeVisible();
    }
  );
});
