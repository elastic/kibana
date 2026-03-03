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
import type { PageObjects } from '@kbn/scout';
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

const addByValueLensPanel = async (pageObjects: PageObjects) => {
  await pageObjects.dashboard.openNewLensPanel();
  await pageObjects.lens.configureXYDimensions();
  await pageObjects.lens.saveAndReturn();
};

const applyCustomTimeRange = async (pageObjects: PageObjects, panelTitle?: string) => {
  await pageObjects.dashboard.openCustomizePanel(panelTitle);
  await pageObjects.dashboard.enableCustomTimeRange();
  await pageObjects.dashboard.openDatePickerQuickMenu();
  await pageObjects.dashboard.clickCommonlyUsedTimeRange('Last_30 days');
  await pageObjects.dashboard.saveCustomizePanel();
};

const removeCustomTimeRange = async (pageObjects: PageObjects) => {
  await pageObjects.dashboard.clickTimeRangeBadge();
  await pageObjects.dashboard.disableCustomTimeRange();
  await pageObjects.dashboard.saveCustomizePanel();
};

spaceTest.describe('Panel time range (dashboard)', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await scoutSpace.savedObjects.load(LENS_BASIC_KIBANA_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(LENS_BASIC_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(LENS_BASIC_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'by value: can add a custom time range to a panel',
    async ({ pageObjects }, testInfo) => {
      await spaceTest.step('create dashboard and add by-value lens panel', async () => {
        await createDashboard(pageObjects, `${DASHBOARD_NAME_PREFIX} - ${testInfo.title}`);
        await addByValueLensPanel(pageObjects);
      });

      await spaceTest.step('apply custom time range and verify badge', async () => {
        await applyCustomTimeRange(pageObjects);
        await pageObjects.dashboard.expectTimeRangeBadgeExists();
        await pageObjects.dashboard.expectEmptyPlaceholderVisible();
        expect(await pageObjects.dashboard.getPanelCount()).toBe(1);
        await pageObjects.dashboard.clickQuickSave();
      });
    }
  );

  spaceTest(
    'by value: can remove a custom time range from a panel',
    async ({ pageObjects }, testInfo) => {
      await spaceTest.step('create dashboard and add by-value lens panel', async () => {
        await createDashboard(pageObjects, `${DASHBOARD_NAME_PREFIX} - ${testInfo.title}`);
        await addByValueLensPanel(pageObjects);
      });

      await spaceTest.step('apply custom time range', async () => {
        await applyCustomTimeRange(pageObjects);
        await pageObjects.dashboard.expectTimeRangeBadgeExists();
      });

      await spaceTest.step('remove custom time range and verify panel', async () => {
        await removeCustomTimeRange(pageObjects);
        await pageObjects.dashboard.expectTimeRangeBadgeMissing();
        await pageObjects.dashboard.expectXYVisChartVisible();
        expect(await pageObjects.dashboard.getPanelCount()).toBe(1);
      });
    }
  );

  spaceTest(
    'by reference: can add a custom time range to panel',
    async ({ pageObjects }, testInfo) => {
      const libraryTitle = `My by reference visualization - ${testInfo.title.replace(/\s+/g, '-')}`;

      await spaceTest.step('create dashboard and save Lens to library', async () => {
        await createDashboard(pageObjects, `${DASHBOARD_NAME_PREFIX} - ${testInfo.title}`);
        await addByValueLensPanel(pageObjects);
        await pageObjects.dashboard.saveToLibrary(libraryTitle);
      });

      await spaceTest.step('apply custom time range and verify badge', async () => {
        await applyCustomTimeRange(pageObjects, libraryTitle);
        await pageObjects.dashboard.expectTimeRangeBadgeExists();
        await pageObjects.dashboard.expectEmptyPlaceholderVisible();
        expect(await pageObjects.dashboard.getPanelCount()).toBe(1);
        await pageObjects.dashboard.clickQuickSave();
      });
    }
  );

  spaceTest(
    'by reference: can remove a custom time range from a panel',
    async ({ pageObjects }, testInfo) => {
      const libraryTitle = `My by reference visualization - ${testInfo.title.replace(/\s+/g, '-')}`;

      await spaceTest.step('create dashboard and save Lens to library', async () => {
        await createDashboard(pageObjects, `${DASHBOARD_NAME_PREFIX} - ${testInfo.title}`);
        await addByValueLensPanel(pageObjects);
        await pageObjects.dashboard.saveToLibrary(libraryTitle);
      });

      await spaceTest.step('apply custom time range', async () => {
        await applyCustomTimeRange(pageObjects, libraryTitle);
        await pageObjects.dashboard.expectTimeRangeBadgeExists();
      });

      await spaceTest.step('remove custom time range and verify panel', async () => {
        await removeCustomTimeRange(pageObjects);
        await pageObjects.dashboard.expectTimeRangeBadgeMissing();
        await pageObjects.dashboard.expectXYVisChartVisible();
        expect(await pageObjects.dashboard.getPanelCount()).toBe(1);
      });
    }
  );
});
