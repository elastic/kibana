/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest, tags } from '@kbn/scout';
import type { PageObjects } from '@kbn/scout';

const KIBANA_ARCHIVE_PATH =
  'x-pack/platform/test/functional/fixtures/kbn_archives/lens/lens_basic.json';
const DATA_VIEW_NAME = 'logstash-*';
const LENS_TITLE = 'Artistpreviouslyknownaslens';

spaceTest.describe('Dashboard panel custom time range', { tag: tags.ESS_ONLY }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(KIBANA_ARCHIVE_PATH);
    await scoutSpace.uiSettings.setDefaultIndex(DATA_VIEW_NAME);
    await scoutSpace.uiSettings.setDefaultTime({
      from: 'Sep 22, 2015 @ 00:00:00.000',
      to: 'Sep 23, 2015 @ 00:00:00.000',
    });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.dashboard.goto();
    await pageObjects.dashboard.openNewDashboard();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  const addLensPanelFromLibrary = async (pageObjects: PageObjects) => {
    await pageObjects.dashboard.addLens(LENS_TITLE);
    await pageObjects.dashboard.waitForRenderComplete();
  };

  const addByValueLensPanel = async (pageObjects: PageObjects) => {
    await addLensPanelFromLibrary(pageObjects);
    await pageObjects.dashboard.clonePanel(LENS_TITLE);
    await pageObjects.dashboard.removePanel(LENS_TITLE);
    await pageObjects.dashboard.waitForRenderComplete();
  };

  spaceTest('by value: can add a custom time range to a panel', async ({ pageObjects }) => {
    await spaceTest.step('add by value panel', async () => {
      await addByValueLensPanel(pageObjects);
    });

    await spaceTest.step('enable custom time range and save', async () => {
      await pageObjects.dashboard.openCustomizePanel();
      await pageObjects.dashboard.enableCustomTimeRange();
      await pageObjects.dashboard.openDatePickerQuickMenu();
      await pageObjects.dashboard.clickCommonlyUsedTimeRange('Last_30 days');
      await pageObjects.dashboard.saveCustomizePanel();
      await pageObjects.dashboard.waitForRenderComplete();
    });

    await spaceTest.step('verify custom time range badge', async () => {
      await pageObjects.dashboard.expectTimeRangeBadgeExists();
    });
  });

  spaceTest('by value: can remove a custom time range from a panel', async ({ pageObjects }) => {
    await spaceTest.step('add by value panel with custom time range', async () => {
      await addByValueLensPanel(pageObjects);
      await pageObjects.dashboard.openCustomizePanel();
      await pageObjects.dashboard.enableCustomTimeRange();
      await pageObjects.dashboard.openDatePickerQuickMenu();
      await pageObjects.dashboard.clickCommonlyUsedTimeRange('Last_30 days');
      await pageObjects.dashboard.saveCustomizePanel();
      await pageObjects.dashboard.waitForRenderComplete();
    });

    await spaceTest.step('remove custom time range', async () => {
      await pageObjects.dashboard.clickTimeRangeBadge();
      await pageObjects.dashboard.disableCustomTimeRange();
      await pageObjects.dashboard.saveCustomizePanel();
      await pageObjects.dashboard.waitForRenderComplete();
    });

    await spaceTest.step('verify badge removed', async () => {
      await pageObjects.dashboard.expectTimeRangeBadgeMissing();
    });
  });

  spaceTest('by reference: can add a custom time range to panel', async ({ pageObjects }) => {
    await spaceTest.step('add by reference panel', async () => {
      await addLensPanelFromLibrary(pageObjects);
    });

    await spaceTest.step('enable custom time range and save', async () => {
      await pageObjects.dashboard.openCustomizePanel();
      await pageObjects.dashboard.enableCustomTimeRange();
      await pageObjects.dashboard.openDatePickerQuickMenu();
      await pageObjects.dashboard.clickCommonlyUsedTimeRange('Last_30 days');
      await pageObjects.dashboard.saveCustomizePanel();
      await pageObjects.dashboard.waitForRenderComplete();
    });

    await spaceTest.step('verify custom time range badge', async () => {
      await pageObjects.dashboard.expectTimeRangeBadgeExists();
    });
  });

  spaceTest(
    'by reference: can remove a custom time range from a panel',
    async ({ pageObjects }) => {
      await spaceTest.step('add by reference panel with custom time range', async () => {
        await addLensPanelFromLibrary(pageObjects);
        await pageObjects.dashboard.openCustomizePanel();
        await pageObjects.dashboard.enableCustomTimeRange();
        await pageObjects.dashboard.openDatePickerQuickMenu();
        await pageObjects.dashboard.clickCommonlyUsedTimeRange('Last_30 days');
        await pageObjects.dashboard.saveCustomizePanel();
        await pageObjects.dashboard.waitForRenderComplete();
      });

      await spaceTest.step('remove custom time range', async () => {
        await pageObjects.dashboard.clickTimeRangeBadge();
        await pageObjects.dashboard.disableCustomTimeRange();
        await pageObjects.dashboard.saveCustomizePanel();
        await pageObjects.dashboard.waitForRenderComplete();
      });

      await spaceTest.step('verify badge removed', async () => {
        await pageObjects.dashboard.expectTimeRangeBadgeMissing();
      });
    }
  );
});
