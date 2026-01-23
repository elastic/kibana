/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest, expect, tags } from '@kbn/scout';
import type { PageObjects, ScoutPage } from '@kbn/scout';
import {
  LENS_BASIC_KIBANA_ARCHIVE,
  LENS_BASIC_DATA_VIEW,
  LENS_BASIC_TIME_RANGE,
} from '../constants';

const DASHBOARD_NAME_PREFIX = 'Panel time range';

const createDashboard = async (pageObjects: PageObjects, dashboardName: string) => {
  await pageObjects.dashboard.goto();
  await pageObjects.dashboard.openNewDashboard();
  await pageObjects.dashboard.saveDashboard(dashboardName);
};

const addByValueLensPanel = async (pageObjects: PageObjects, page: ScoutPage) => {
  await pageObjects.dashboard.openAddPanelFlyout();
  await page.testSubj.click('create-action-Lens');
  await page.testSubj.waitForSelector('lnsApp', { state: 'visible' });

  await page.testSubj.click('lnsXY_yDimensionPanel > lns-empty-dimension');
  await page.testSubj.click('lns-indexPatternDimension-average');
  await page.testSubj.click('indexPattern-dimension-field');
  await page.testSubj.typeWithDelay('indexPattern-dimension-field > comboBoxSearchInput', 'bytes');
  await page.testSubj.click('lns-fieldOption-bytes');
  await page.testSubj.click('lns-indexPattern-dimensionContainerClose');

  await page.testSubj.click('lnsXY_xDimensionPanel > lns-empty-dimension');
  await page.testSubj.click('lns-indexPatternDimension-date_histogram');
  await page.testSubj.click('indexPattern-dimension-field');
  await page.testSubj.typeWithDelay(
    'indexPattern-dimension-field > comboBoxSearchInput',
    '@timestamp'
  );
  await page.testSubj.click('lns-fieldOption-@timestamp');
  await page.testSubj.click('lns-indexPattern-dimensionContainerClose');

  await page.testSubj.click('lnsXY_splitDimensionPanel > lns-empty-dimension');
  await page.testSubj.click('lns-indexPatternDimension-terms');
  await page.testSubj.click('indexPattern-dimension-field');
  await page.testSubj.typeWithDelay('indexPattern-dimension-field > comboBoxSearchInput', 'ip');
  await page.testSubj.click('lns-fieldOption-ip');
  await page.testSubj.click('lns-indexPattern-dimensionContainerClose');
  await pageObjects.lens.saveAndReturn();
  await pageObjects.dashboard.waitForRenderComplete();
};

const applyCustomTimeRange = async (pageObjects: PageObjects, panelTitle?: string) => {
  await pageObjects.dashboard.openCustomizePanel(panelTitle);
  await pageObjects.dashboard.enableCustomTimeRange();
  await pageObjects.dashboard.openDatePickerQuickMenu();
  await pageObjects.dashboard.clickCommonlyUsedTimeRange('Last_30 days');
  await pageObjects.dashboard.saveCustomizePanel();
  await pageObjects.dashboard.waitForRenderComplete();
};

const removeCustomTimeRange = async (pageObjects: PageObjects) => {
  await pageObjects.dashboard.clickTimeRangeBadge();
  await pageObjects.dashboard.disableCustomTimeRange();
  await pageObjects.dashboard.saveCustomizePanel();
  await pageObjects.dashboard.waitForRenderComplete();
};

spaceTest.describe('Panel time range (dashboard)', { tag: tags.ESS_ONLY }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await scoutSpace.savedObjects.load(LENS_BASIC_KIBANA_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(LENS_BASIC_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(LENS_BASIC_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'by value: can add a custom time range to a panel',
    async ({ pageObjects, page }, testInfo) => {
      await spaceTest.step('create dashboard and add by-value lens panel', async () => {
        await createDashboard(pageObjects, `${DASHBOARD_NAME_PREFIX} - ${testInfo.title}`);
        await addByValueLensPanel(pageObjects, page);
      });

      await spaceTest.step('apply custom time range and verify badge', async () => {
        await applyCustomTimeRange(pageObjects);
        await pageObjects.dashboard.expectTimeRangeBadgeExists();
        await expect(page.testSubj.locator('emptyPlaceholder')).toBeVisible();
        await pageObjects.dashboard.clickQuickSave();
      });
    }
  );

  spaceTest(
    'by value: can remove a custom time range from a panel',
    async ({ pageObjects, page }, testInfo) => {
      await spaceTest.step('create dashboard and add by-value lens panel', async () => {
        await createDashboard(pageObjects, `${DASHBOARD_NAME_PREFIX} - ${testInfo.title}`);
        await addByValueLensPanel(pageObjects, page);
      });

      await spaceTest.step('apply custom time range', async () => {
        await applyCustomTimeRange(pageObjects);
        await pageObjects.dashboard.expectTimeRangeBadgeExists();
      });

      await spaceTest.step('remove custom time range and verify panel', async () => {
        await removeCustomTimeRange(pageObjects);
        await pageObjects.dashboard.expectTimeRangeBadgeMissing();
        await expect(page.testSubj.locator('xyVisChart')).toBeVisible();
      });
    }
  );

  spaceTest(
    'by reference: can add a custom time range to panel',
    async ({ pageObjects, page }, testInfo) => {
      const libraryTitle = `My by reference visualization - ${testInfo.title.replace(/\s+/g, '-')}`;

      await spaceTest.step('create dashboard and save Lens to library', async () => {
        await createDashboard(pageObjects, `${DASHBOARD_NAME_PREFIX} - ${testInfo.title}`);
        await addByValueLensPanel(pageObjects, page);
        await pageObjects.dashboard.saveToLibrary(libraryTitle);
      });

      await spaceTest.step('apply custom time range and verify badge', async () => {
        await applyCustomTimeRange(pageObjects, libraryTitle);
        await pageObjects.dashboard.expectTimeRangeBadgeExists();
        await expect(page.testSubj.locator('emptyPlaceholder')).toBeVisible();
        await pageObjects.dashboard.clickQuickSave();
      });
    }
  );

  spaceTest(
    'by reference: can remove a custom time range from a panel',
    async ({ pageObjects, page }, testInfo) => {
      const libraryTitle = `My by reference visualization - ${testInfo.title.replace(/\s+/g, '-')}`;

      await spaceTest.step('create dashboard and save Lens to library', async () => {
        await createDashboard(pageObjects, `${DASHBOARD_NAME_PREFIX} - ${testInfo.title}`);
        await addByValueLensPanel(pageObjects, page);
        await pageObjects.dashboard.saveToLibrary(libraryTitle);
      });

      await spaceTest.step('apply custom time range', async () => {
        await applyCustomTimeRange(pageObjects, libraryTitle);
        await pageObjects.dashboard.expectTimeRangeBadgeExists();
      });

      await spaceTest.step('remove custom time range and verify panel', async () => {
        await removeCustomTimeRange(pageObjects);
        await pageObjects.dashboard.expectTimeRangeBadgeMissing();
        await expect(page.testSubj.locator('xyVisChart')).toBeVisible();
      });
    }
  );
});
