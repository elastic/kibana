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
import type { ScoutPage } from '@kbn/scout';
import {
  findImportedSavedObjectId,
  getDashboardPanels,
  openDashboard,
} from '../../../utils/migration_smoke_helpers';
import { MIGRATION_SMOKE_EXPORTS_DIR, SHAKESPEARE_DATA_VIEW_TITLE } from '../../constants';

const EXPORT_PATH = `${MIGRATION_SMOKE_EXPORTS_DIR}/controls_dashboard_migration_test_8_0_0.json`;
const DASHBOARD_TITLE = '[8.0.0] Controls Dashboard';

let dashboardId = '';

const getControlIds = async (page: ScoutPage) => {
  const controls = await page.locator('[data-control-id]').all();
  return Promise.all(
    controls.map(async (control) => (await control.getAttribute('data-control-id')) ?? '')
  );
};

const openOptionsListPopover = async (page: ScoutPage, controlId: string) => {
  await page.testSubj.click(`optionsList-control-${controlId}`);
  await page.testSubj
    .locator('optionsList-control-available-options')
    .waitFor({ state: 'visible' });
};

const closeOptionsListPopover = async (page: ScoutPage, controlId: string) => {
  await page.testSubj.click(`optionsList-control-${controlId}`);
  await page.testSubj.locator('optionsList-control-available-options').waitFor({ state: 'hidden' });
};

const getAvailableOptionsCount = async (page: ScoutPage) => {
  const availableOptions = page.testSubj.locator('optionsList-control-available-options');
  return Number((await availableOptions.getAttribute('data-option-count')) ?? '0');
};

const getSelectionsString = async (page: ScoutPage, controlId: string) => {
  const controlButton = page.testSubj.locator(`optionsList-control-${controlId}`);
  const selections = controlButton.locator('[data-test-subj="optionsListSelections"]');
  const [selectionText = ''] = await selections.allInnerTexts();
  const buttonText = await controlButton.innerText();
  return (selectionText || buttonText).trim();
};

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
      await spaceTest.step('open the migrated dashboard', async () => {
        await openDashboard(page, dashboardId);
        await page.reload();
        await pageObjects.dashboard.waitForRenderComplete();
        const panels = await getDashboardPanels(kbnClient, scoutSpace.id, dashboardId);
        await expect(page.testSubj.locator('embeddablePanel')).toHaveCount(panels.length);
      });

      await spaceTest.step('verify panels and controls render', async () => {
        await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
        await expect(page.testSubj.locator('control-frame')).toHaveCount(2);

        const controlIds = await getControlIds(page);
        for (const controlId of controlIds) {
          const controlTitle = page.locator(`#control-title-${controlId}`);
          await expect(controlTitle.locator('[data-test-subj="embeddableError"]')).toHaveCount(0);
        }
      });

      await spaceTest.step('verify control titles and options', async () => {
        const titles = await page.testSubj.locator('control-frame-title').allInnerTexts();
        const normalizedTitles = titles.map((title) => title.split('\n')[0].trim());
        expect(normalizedTitles).toStrictEqual(['Speaker Name', 'Play Name']);

        const [speakerControlId, playControlId] = await getControlIds(page);

        await openOptionsListPopover(page, speakerControlId);
        await expect.poll(async () => getAvailableOptionsCount(page)).toBe(10);
        await closeOptionsListPopover(page, speakerControlId);

        await openOptionsListPopover(page, playControlId);
        await expect.poll(async () => getAvailableOptionsCount(page)).toBe(5);
        await closeOptionsListPopover(page, playControlId);
      });

      await spaceTest.step('verify default control selections', async () => {
        const [speakerControlId] = await getControlIds(page);
        const selectionString = await getSelectionsString(page, speakerControlId);
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
