/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

// Use a `logstash*` wildcard (not `log*`) so the ad-hoc data view resolves to
// exactly the `logstash_functional` fixture indices. A broader `log*` would
// also match unrelated `log*` indices on the shared cluster (e.g. synthtrace
// `logs-*` data streams), making hit-count assertions non-deterministic.
const NO_TIME_DATA_VIEW = 'logstash*';

const assertClassicPanelState = async ({
  page,
  sidebarOpen,
  chartOpen,
  tableOpen,
  totalHits,
}: {
  page: ScoutPage;
  sidebarOpen: boolean;
  chartOpen: boolean;
  tableOpen: boolean;
  totalHits: string;
}) => {
  if (tableOpen) {
    await expect(page.testSubj.locator('discoverQueryHits')).toHaveText(totalHits);
  }

  if (sidebarOpen) {
    await expect(page.testSubj.locator('fieldList')).toBeVisible();
  } else {
    await expect(page.testSubj.locator('fieldList')).toBeHidden();
  }
  await expect(page.testSubj.locator('dscHideSidebarButton')).toHaveCount(sidebarOpen ? 1 : 0);
  await expect(page.testSubj.locator('dscShowSidebarButton')).toHaveCount(sidebarOpen ? 0 : 1);

  await expect(page.testSubj.locator('unifiedHistogramChart')).toHaveCount(chartOpen ? 1 : 0);
  await expect(page.testSubj.locator('discoverDocTable')).toHaveCount(tableOpen ? 1 : 0);

  if (chartOpen) {
    await expect(page.testSubj.locator('dscPanelsToggleInHistogram')).toBeVisible();
    await expect(page.testSubj.locator('dscHideHistogramButton')).toBeVisible();
    await expect(page.testSubj.locator('dscPanelsToggleInPage')).toHaveCount(0);
    await expect(page.testSubj.locator('dscShowHistogramButton')).toHaveCount(0);
  } else {
    await expect(page.testSubj.locator('dscPanelsToggleInHistogram')).toHaveCount(0);
    await expect(page.testSubj.locator('dscHideHistogramButton')).toHaveCount(0);
    await expect(page.testSubj.locator('dscPanelsToggleInPage')).toBeVisible();
    await expect(page.testSubj.locator('dscShowHistogramButton')).toBeVisible();
  }

  await expect(page.testSubj.locator('dscHideTableButton')).toHaveCount(tableOpen ? 1 : 0);
  await expect(page.testSubj.locator('dscShowTableButton')).toHaveCount(tableOpen ? 0 : 1);
};

spaceTest.describe('Discover panel toggles in classic mode', { tag: tags.stateful.all }, () => {
  spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
    await apiServices.dataViews.create({
      title: NO_TIME_DATA_VIEW,
      spaceId: scoutSpace.id,
      override: true,
    });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilSearchingHasFinished();
    await pageObjects.discover.waitForDocTableRendered();
  });

  spaceTest.afterAll(async ({ apiServices, scoutSpace }) => {
    await apiServices.dataViews.deleteByTitle(NO_TIME_DATA_VIEW, scoutSpace.id);
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'toggles sidebar, histogram, and table for a time-based data view',
    async ({ page, pageObjects }) => {
      await assertClassicPanelState({
        page,
        sidebarOpen: true,
        chartOpen: true,
        tableOpen: true,
        totalHits: '14,004',
      });

      await spaceTest.step('toggle the sidebar', async () => {
        await pageObjects.discover.closeSidebar();
        await assertClassicPanelState({
          page,
          sidebarOpen: false,
          chartOpen: true,
          tableOpen: true,
          totalHits: '14,004',
        });

        await pageObjects.discover.openSidebar();
        await assertClassicPanelState({
          page,
          sidebarOpen: true,
          chartOpen: true,
          tableOpen: true,
          totalHits: '14,004',
        });
      });

      await spaceTest.step('toggle the histogram panel', async () => {
        await pageObjects.discover.hideChart();
        await assertClassicPanelState({
          page,
          sidebarOpen: true,
          chartOpen: false,
          tableOpen: true,
          totalHits: '14,004',
        });
        expect(await pageObjects.discover.isButtonDisabled('dscHideTableButton')).toBe(true);

        await pageObjects.discover.showChart();
        await assertClassicPanelState({
          page,
          sidebarOpen: true,
          chartOpen: true,
          tableOpen: true,
          totalHits: '14,004',
        });
      });

      await spaceTest.step('toggle the table panel', async () => {
        await pageObjects.discover.closeTablePanel();
        await assertClassicPanelState({
          page,
          sidebarOpen: true,
          chartOpen: true,
          tableOpen: false,
          totalHits: '14,004',
        });
        expect(await pageObjects.discover.isButtonDisabled('dscHideHistogramButton')).toBe(true);

        await pageObjects.discover.openTablePanel();
        await assertClassicPanelState({
          page,
          sidebarOpen: true,
          chartOpen: true,
          tableOpen: true,
          totalHits: '14,004',
        });
      });

      await spaceTest.step('toggle sidebar and histogram together', async () => {
        await pageObjects.discover.closeSidebar();
        await pageObjects.discover.hideChart();
        await assertClassicPanelState({
          page,
          sidebarOpen: false,
          chartOpen: false,
          tableOpen: true,
          totalHits: '14,004',
        });

        await pageObjects.discover.openSidebar();
        await pageObjects.discover.showChart();
        await assertClassicPanelState({
          page,
          sidebarOpen: true,
          chartOpen: true,
          tableOpen: true,
          totalHits: '14,004',
        });
      });
    }
  );

  spaceTest(
    'toggles the sidebar for a non-time-based data view without chart controls',
    async ({ page, pageObjects }) => {
      await pageObjects.discover.selectDataView(NO_TIME_DATA_VIEW);
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.waitForDocTableRendered();

      await expect(page.testSubj.locator('discoverQueryHits')).toHaveText('14,004');
      await expect(page.testSubj.locator('fieldList')).toBeVisible();
      await expect(page.testSubj.locator('unifiedHistogramChart')).toHaveCount(0);
      await expect(page.testSubj.locator('discoverDocTable')).toBeVisible();
      await expect(page.testSubj.locator('dscPanelsToggleInHistogram')).toHaveCount(0);
      await expect(page.testSubj.locator('dscHideHistogramButton')).toHaveCount(0);
      await expect(page.testSubj.locator('dscShowHistogramButton')).toHaveCount(0);
      await expect(page.testSubj.locator('dscHideTableButton')).toHaveCount(0);
      await expect(page.testSubj.locator('dscShowTableButton')).toHaveCount(0);

      await pageObjects.discover.closeSidebar();
      await expect(page.testSubj.locator('fieldList')).toHaveCount(0);
      await expect(page.testSubj.locator('dscShowSidebarButton')).toBeVisible();

      await pageObjects.discover.openSidebar();
      await expect(page.testSubj.locator('fieldList')).toBeVisible();
      await expect(page.testSubj.locator('dscHideSidebarButton')).toBeVisible();
    }
  );
});
