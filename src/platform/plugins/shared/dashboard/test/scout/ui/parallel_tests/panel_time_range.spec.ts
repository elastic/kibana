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
  LENS_BASIC_DATA_VIEW,
  LENS_BASIC_KIBANA_ARCHIVE,
  LENS_BASIC_TIME_RANGE,
} from '../constants';

const TIME_RANGE_LENS_TITLE = 'lnsXYvis';

spaceTest.describe('Panel custom time range (dashboard)', { tag: tags.ESS_ONLY }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await scoutSpace.savedObjects.load(LENS_BASIC_KIBANA_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(LENS_BASIC_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(LENS_BASIC_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.dashboard.goto();
    await pageObjects.dashboard.openNewDashboard();
    await pageObjects.dashboard.waitForRenderComplete();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  const addLensPanelFromLibrary = async (pageObjects: PageObjects) => {
    await pageObjects.dashboard.addLens(TIME_RANGE_LENS_TITLE);
    await pageObjects.dashboard.waitForRenderComplete();
  };

  const addByValueLensPanel = async (pageObjects: PageObjects) => {
    await addLensPanelFromLibrary(pageObjects);
    await pageObjects.dashboard.clonePanel(TIME_RANGE_LENS_TITLE);
    await pageObjects.dashboard.removePanel(TIME_RANGE_LENS_TITLE);
    await pageObjects.dashboard.waitForRenderComplete();
  };

  const addCustomTimeRange = async (pageObjects: PageObjects) => {
    await pageObjects.dashboard.openCustomizePanel();
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

  const expectEmptyPlaceholder = async (page: ScoutPage) => {
    await expect(page.testSubj.locator('emptyPlaceholder')).toHaveCount(1);
  };

  const expectXyChartRendered = async (page: ScoutPage) => {
    await expect(page.testSubj.locator('xyVisChart')).toHaveCount(1);
  };

  spaceTest('by value: can add a custom time range to a panel', async ({ page, pageObjects }) => {
    await spaceTest.step('add by value panel', async () => {
      await addByValueLensPanel(pageObjects);
      expect(await pageObjects.dashboard.getPanelCount()).toBe(1);
    });

    await spaceTest.step('enable custom time range and save', async () => {
      await addCustomTimeRange(pageObjects);
    });

    await spaceTest.step('verify custom time range badge', async () => {
      await pageObjects.dashboard.expectTimeRangeBadgeExists();
      await expectEmptyPlaceholder(page);
      await pageObjects.dashboard.clickQuickSave();
    });
  });

  spaceTest(
    'by value: can remove a custom time range from a panel',
    async ({ page, pageObjects }) => {
      await spaceTest.step('add by value panel with custom time range', async () => {
        await addByValueLensPanel(pageObjects);
        await addCustomTimeRange(pageObjects);
        expect(await pageObjects.dashboard.getPanelCount()).toBe(1);
      });

      await spaceTest.step('remove custom time range', async () => {
        await removeCustomTimeRange(pageObjects);
      });

      await spaceTest.step('verify badge removed and chart returns', async () => {
        await pageObjects.dashboard.expectTimeRangeBadgeMissing();
        await expectXyChartRendered(page);
      });
    }
  );

  spaceTest('by reference: can add a custom time range to panel', async ({ page, pageObjects }) => {
    await spaceTest.step('add by reference panel', async () => {
      await addLensPanelFromLibrary(pageObjects);
      expect(await pageObjects.dashboard.getPanelCount()).toBe(1);
    });

    await spaceTest.step('enable custom time range and save', async () => {
      await addCustomTimeRange(pageObjects);
    });

    await spaceTest.step('verify custom time range badge', async () => {
      await pageObjects.dashboard.expectTimeRangeBadgeExists();
      await expectEmptyPlaceholder(page);
      await pageObjects.dashboard.clickQuickSave();
    });
  });

  spaceTest(
    'by reference: can remove a custom time range from a panel',
    async ({ page, pageObjects }) => {
      await spaceTest.step('add by reference panel with custom time range', async () => {
        await addLensPanelFromLibrary(pageObjects);
        await addCustomTimeRange(pageObjects);
        expect(await pageObjects.dashboard.getPanelCount()).toBe(1);
      });

      await spaceTest.step('remove custom time range', async () => {
        await removeCustomTimeRange(pageObjects);
      });

      await spaceTest.step('verify badge removed and chart returns', async () => {
        await pageObjects.dashboard.expectTimeRangeBadgeMissing();
        await expectXyChartRendered(page);
      });
    }
  );
});
