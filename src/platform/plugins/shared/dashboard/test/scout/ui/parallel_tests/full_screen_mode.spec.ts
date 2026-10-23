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
import { DASHBOARD_SAVED_SEARCH_ARCHIVE, FEW_PANELS_DASHBOARD_TITLE } from '../constants';
import { findImportedSavedObjectId } from '../../utils/migration_smoke_helpers';

let fewPanelsDashboardId = '';

spaceTest.describe('Dashboard full screen mode', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    const imported = await scoutSpace.savedObjects.load(DASHBOARD_SAVED_SEARCH_ARCHIVE);
    fewPanelsDashboardId = findImportedSavedObjectId(
      imported,
      'dashboard',
      FEW_PANELS_DASHBOARD_TITLE
    );
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.dashboard.openDashboardWithId(fewPanelsDashboardId);
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('full screen mode', async ({ page, pageObjects }) => {
    const { dashboard, filterBar } = pageObjects;
    const visibleChrome = page.testSubj.locator('kbnAppWrapper visibleChrome');
    const hiddenChrome = page.testSubj.locator('kbnAppWrapper hiddenChrome');

    await spaceTest.step('option is not available in edit mode', async () => {
      await dashboard.switchToEditMode();
      expect(await dashboard.hasFullscreenMenuItem()).toBe(false);
    });

    await spaceTest.step('option is available in view mode', async () => {
      // The loaded dashboard reports unsaved changes in edit mode, so exiting without saving
      // opens a "Reset dashboard?" confirm modal
      await dashboard.saveChangesToExistingDashboard();
      await dashboard.clickCancelOutOfEditMode();
      expect(await dashboard.hasFullscreenMenuItem()).toBe(true);
    });

    await spaceTest.step('hides the chrome and shows the exit button', async () => {
      await expect(visibleChrome).toBeVisible();
      await dashboard.enterFullscreen();
      await expect(hiddenChrome).toBeVisible();
      await expect(page.testSubj.locator('exitFullScreenModeButton')).toBeVisible();
    });

    await spaceTest.step('exit text button is shown when a panel is expanded', async () => {
      await dashboard.togglePanelExpand();
      await expect(page.testSubj.locator('exitFullScreenModeText')).toBeVisible();
    });

    await spaceTest.step('clicking the text button exits full screen', async () => {
      await page.testSubj.click('exitFullScreenModeText');
      await expect(visibleChrome).toBeVisible();
    });

    await spaceTest.step('shows filter bar in full screen mode', async () => {
      await filterBar.addFilter({ field: 'bytes', operator: 'is', value: '12345678' });
      await dashboard.waitForRenderComplete();
      await dashboard.enterFullscreen();
      await expect(hiddenChrome).toBeVisible();
      expect(await filterBar.getFilterCount()).toBe(1);
      await page.testSubj.click('exitFullScreenModeButton');
      await expect(visibleChrome).toBeVisible();
    });

    await spaceTest.step('exits full screen mode when back button pressed', async () => {
      // Arrive via the listing page so back navigation stays inside Kibana
      await dashboard.goto();
      await dashboard.openDashboardWithId(fewPanelsDashboardId);
      await dashboard.enterFullscreen();
      await page.goBack();
      await expect(visibleChrome).toBeVisible();

      await page.goForward();
      await expect(visibleChrome).toBeVisible();
    });
  });
});
