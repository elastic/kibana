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
import {
  DASHBOARD_DEFAULT_INDEX_TITLE,
  DASHBOARD_SAVED_SEARCH_ARCHIVE,
  FEW_PANELS_DASHBOARD_PANEL_COUNT,
  FEW_PANELS_DASHBOARD_TITLE,
} from '../constants';
import { findImportedSavedObjectId } from '../../utils/migration_smoke_helpers';

let fewPanelsDashboardId = '';

spaceTest.describe('Dashboard embed top menu', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    const imported = await scoutSpace.savedObjects.load(DASHBOARD_SAVED_SEARCH_ARCHIVE);
    fewPanelsDashboardId = findImportedSavedObjectId(
      imported,
      'dashboard',
      FEW_PANELS_DASHBOARD_TITLE
    );
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
    'does not show the edit button when show-top-menu is false',
    async ({ page, pageObjects }) => {
      await page.gotoApp('dashboards', {
        hash: `/view/${fewPanelsDashboardId}?embed=true&show-top-menu=false`,
      });
      await pageObjects.dashboard.waitForRenderComplete();
      await expect
        .poll(() => pageObjects.dashboard.getPanelCount())
        .toBe(FEW_PANELS_DASHBOARD_PANEL_COUNT);

      await expect(page.testSubj.locator('dashboardEditMode')).toBeHidden();
    }
  );

  spaceTest('shows the edit button when show-top-menu is true', async ({ page, pageObjects }) => {
    await page.gotoApp('dashboards', {
      hash: `/view/${fewPanelsDashboardId}?embed=true&show-top-menu=true`,
    });
    await pageObjects.dashboard.waitForRenderComplete();
    await expect
      .poll(() => pageObjects.dashboard.getPanelCount())
      .toBe(FEW_PANELS_DASHBOARD_PANEL_COUNT);

    await expect(page.testSubj.locator('dashboardEditMode')).toBeVisible();
  });
});
