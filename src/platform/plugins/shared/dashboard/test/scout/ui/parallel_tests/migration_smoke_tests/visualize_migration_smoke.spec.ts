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
  ensureIndexPatternFromExport,
  findImportedSavedObjectId,
  getDashboardPanels,
} from '../../../utils/migration_smoke_helpers';
import {
  DASHBOARD_EDIT_PANEL_ACTION_TEST_SUBJ,
  MIGRATION_SMOKE_EXPORTS_DIR,
  SHAKESPEARE_DATA_VIEW_TITLE,
} from '../../constants';

const EXPORT_PATH = `${MIGRATION_SMOKE_EXPORTS_DIR}/visualize_dashboard_migration_test_7_12_1.json`;
const DASHBOARD_TITLE = '[7.12.1] Visualize Test Dashboard';

let dashboardId = '';

const getPanelDrilldownCounts = (
  panels: Array<{
    embeddableConfig?: { enhancements?: { dynamicActions?: { events?: unknown[] } } };
  }>
) => {
  let panelsWithDrilldowns = 0;
  for (const panel of panels) {
    const events = panel.embeddableConfig?.enhancements?.dynamicActions?.events ?? [];
    panelsWithDrilldowns += Number(events.length > 0);
  }

  return { panelsWithDrilldowns };
};

spaceTest.describe('Visualize migration smoke (7.12.1)', { tag: tags.ESS_ONLY }, () => {
  spaceTest.beforeAll(async ({ scoutSpace, kbnClient }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    const imported = await scoutSpace.savedObjects.load(EXPORT_PATH);
    dashboardId = findImportedSavedObjectId(imported, 'dashboard', DASHBOARD_TITLE);
    await ensureIndexPatternFromExport(kbnClient, scoutSpace.id, EXPORT_PATH);
    await scoutSpace.uiSettings.setDefaultIndex(SHAKESPEARE_DATA_VIEW_TITLE);
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'imports and renders Visualize panels without regressions',
    async ({ page, pageObjects, kbnClient, scoutSpace }) => {
      await spaceTest.step('open the migrated dashboard', async () => {
        await pageObjects.dashboard.openDashboardWithId(dashboardId);
        const panels = await getDashboardPanels(kbnClient, scoutSpace.id, dashboardId);
        expect(await pageObjects.dashboard.getPanelCount()).toBe(panels.length);
      });

      await spaceTest.step('verify panels render without errors', async () => {
        await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
      });

      await spaceTest.step('verify panel actions and drilldowns', async () => {
        await pageObjects.dashboard.switchToEditMode();
        const panelTitles = await pageObjects.dashboard.getPanelTitles();
        for (const title of panelTitles) {
          expect(
            await pageObjects.dashboard.panelHasAction(
              DASHBOARD_EDIT_PANEL_ACTION_TEST_SUBJ,
              title || undefined
            )
          ).toBe(true);
        }

        const panels = await getDashboardPanels(kbnClient, scoutSpace.id, dashboardId);
        const { panelsWithDrilldowns } = getPanelDrilldownCounts(panels);
        expect(panelsWithDrilldowns).toBe(2);
      });
    }
  );
});
