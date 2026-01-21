/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest, expect, tags } from '@kbn/scout';
import {
  findImportedSavedObjectId,
  getDashboardPanels,
  openDashboard,
} from '../../../utils/migration_smoke_helpers';

const EXPORT_PATH =
  'src/platform/plugins/shared/dashboard/test/scout/ui/parallel_tests/migration_smoke_tests/exports/tsvb_dashboard_migration_test_7_12_1.json';
const DASHBOARD_TITLE = 'TSVB Index Pattern Smoke Test';
const DATA_VIEW_TITLE = 'logstash*';

let dashboardId = '';

const getPanelDrilldownCounts = (
  panels: Array<{
    embeddableConfig?: { enhancements?: { dynamicActions?: { events?: unknown[] } } };
  }>
) => {
  let panelsWithDrilldowns = 0;
  let drilldownCount = 0;
  for (const panel of panels) {
    const events = panel.embeddableConfig?.enhancements?.dynamicActions?.events ?? [];
    panelsWithDrilldowns += Number(events.length > 0);
    drilldownCount += events.length;
  }

  return { panelsWithDrilldowns, drilldownCount };
};

spaceTest.describe('TSVB migration smoke (7.12.1)', { tag: tags.ESS_ONLY }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    const imported = await scoutSpace.savedObjects.load(EXPORT_PATH);
    dashboardId = findImportedSavedObjectId(imported, 'dashboard', DASHBOARD_TITLE);
    await scoutSpace.uiSettings.setDefaultIndex(DATA_VIEW_TITLE);
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'imports and renders TSVB panels without regressions',
    async ({ page, pageObjects, kbnClient, scoutSpace }) => {
      await spaceTest.step('open the migrated dashboard', async () => {
        await openDashboard(page, dashboardId);
        await pageObjects.dashboard.waitForRenderComplete();
        const panels = await getDashboardPanels(kbnClient, scoutSpace.id, dashboardId);
        await expect(page.testSubj.locator('embeddablePanel')).toHaveCount(panels.length);
      });

      await spaceTest.step('verify panels render without errors', async () => {
        await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
      });

      await spaceTest.step('verify panel actions and drilldowns', async () => {
        await pageObjects.dashboard.switchToEditMode();
        const panelTitles = await pageObjects.dashboard.getPanelTitles();
        for (const title of panelTitles) {
          await pageObjects.dashboard.expectExistsPanelAction(
            'embeddablePanelAction-editPanel',
            title || undefined
          );
        }

        const panels = await getDashboardPanels(kbnClient, scoutSpace.id, dashboardId);
        const { panelsWithDrilldowns, drilldownCount } = getPanelDrilldownCounts(panels);
        expect(panelsWithDrilldowns).toBe(2);
        expect(drilldownCount).toBe(3);
      });
    }
  );
});
