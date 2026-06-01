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
  FEW_PANELS_DASHBOARD_TITLE,
} from '../constants';
import { findImportedSavedObjectId } from '../../utils/migration_smoke_helpers';

const FEW_PANELS_PANEL_TITLES = [
  'Rendering Test: heatmap',
  'Rendering Test: guage',
  'Rendering Test: datatable',
] as const;

let fewPanelsDashboardId = '';

spaceTest.describe('Dashboard clone', { tag: tags.deploymentAgnostic }, () => {
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
    'save as copy creates a numbered clone with the same panels',
    async ({ pageObjects, page }) => {
      await pageObjects.dashboard.openDashboardWithId(fewPanelsDashboardId);
      await pageObjects.dashboard.ensureEditMode();
      await pageObjects.dashboard.saveDashboardAsCopy();

      await expect(page.testSubj.locator('breadcrumb last')).toContainText(
        `${FEW_PANELS_DASHBOARD_TITLE} (1)`
      );
      await expect
        .poll(() => pageObjects.dashboard.getPanelCount())
        .toBe(FEW_PANELS_PANEL_TITLES.length);
      await expect
        .poll(async () => [...(await pageObjects.dashboard.getPanelTitles())].sort())
        .toStrictEqual([...FEW_PANELS_PANEL_TITLES].sort());
    }
  );
});
