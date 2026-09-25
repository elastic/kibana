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
  findImportedSavedObjectId,
  getDashboardPanels,
  openDashboard,
} from '../../../utils/migration_smoke_helpers';
import { MIGRATION_SMOKE_EXPORTS_DIR, SHAKESPEARE_DATA_VIEW_TITLE } from '../../constants';

const EXPORT_PATH = `${MIGRATION_SMOKE_EXPORTS_DIR}/controls_dashboard_migration_test_8_0_0.json`;
const DASHBOARD_TITLE = '[8.0.0] Controls Dashboard';

let dashboardId = '';

spaceTest.describe('Controls migration smoke (8.0.0)', { tag: tags.stateful.classic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    const imported = await scoutSpace.savedObjects.load(EXPORT_PATH);
    dashboardId = findImportedSavedObjectId(imported, 'dashboard', DASHBOARD_TITLE);
    await scoutSpace.uiSettings.setDefaultIndex(SHAKESPEARE_DATA_VIEW_TITLE);
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'imports and renders controls without regressions',
    async ({ page, pageObjects, kbnClient, scoutSpace }) => {
      const { controls } = pageObjects;

      await spaceTest.step('open the migrated dashboard', async () => {
        await openDashboard(page, dashboardId);
        await page.reload();
        await pageObjects.dashboard.waitForRenderComplete();
        const panels = await getDashboardPanels(kbnClient, scoutSpace.id, dashboardId);
        await expect(page.testSubj.locator('embeddablePanel')).toHaveCount(panels.length);
      });

      await spaceTest.step('verify panels and controls render', async () => {
        await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
        await expect(controls.frames).toHaveCount(2);

        const controlIds = await controls.getControlIds();
        for (const controlId of controlIds) {
          const controlTitle = page.locator(`#control-title-${controlId}`);
          await expect(controlTitle.locator('[data-test-subj="embeddableError"]')).toHaveCount(0);
        }
      });

      await spaceTest.step('verify control titles and options', async () => {
        const titles = await page.testSubj.locator('control-frame-title').allInnerTexts();
        const normalizedTitles = titles.map((title) => title.split('\n')[0].trim());
        expect(normalizedTitles).toStrictEqual(['Speaker Name', 'Play Name']);

        const [speakerControlId, playControlId] = await controls.getControlIds();

        await controls.optionsList.openPopover(speakerControlId);
        await expect.poll(() => controls.optionsList.getAvailableOptionsCount()).toBe(10);
        await controls.optionsList.ensurePopoverIsClosed();

        await controls.optionsList.openPopover(playControlId);
        await expect.poll(() => controls.optionsList.getAvailableOptionsCount()).toBe(5);
        await controls.optionsList.ensurePopoverIsClosed();
      });

      await spaceTest.step('verify default control selections', async () => {
        const [speakerControlId] = await controls.getControlIds();
        const selectionString = await controls.optionsList.getSelectionsString(speakerControlId);
        expect(selectionString).toBe('HAMLET, ROMEO, JULIET, BRUTUS');
      });

      await spaceTest.step('verify pie chart reflects selected options', async () => {
        const partitionChart = page.testSubj.locator('partitionVisChart');
        await expect(partitionChart).toBeVisible();
        const legendItems = partitionChart.locator('.echLegendItem__label');
        await expect.poll(async () => await legendItems.count()).toBe(4);
      });
    }
  );
});
