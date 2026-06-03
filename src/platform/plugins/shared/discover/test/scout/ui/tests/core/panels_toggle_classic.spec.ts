/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';
import { DISCOVER_LOGSTASH_ALL_ROLE } from '../../fixtures/common/custom_roles';
import {
  closeSidebar,
  closeTablePanel,
  hitCount,
  isButtonDisabled,
  isTestSubjectVisible,
  openSidebar,
  openTablePanel,
} from '../../fixtures/common/discover_panels';

const NO_TIME_DATA_VIEW = 'log*';
const DEFAULT_TIME_RANGE = `{ "from": "${testData.DEFAULT_TIME_RANGE.from}", "to": "${testData.DEFAULT_TIME_RANGE.to}"}`;

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
    await expect(hitCount(page)).toHaveText(totalHits);
  }

  expect(await isTestSubjectVisible(page, 'fieldList')).toBe(sidebarOpen);
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

test.describe(
  'Discover panel toggles in classic mode',
  { tag: testData.DISCOVER_STATEFUL_TAGS },
  () => {
    test.beforeAll(async ({ apiServices, kbnClient }) => {
      await kbnClient.importExport.load(testData.DISCOVER_KBN_ARCHIVE);
      await kbnClient.uiSettings.update({
        defaultIndex: testData.DEFAULT_DATA_VIEW,
        'timepicker:timeDefaults': DEFAULT_TIME_RANGE,
      });
      await apiServices.dataViews.create({
        title: NO_TIME_DATA_VIEW,
        override: true,
      });
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginWithCustomRole(DISCOVER_LOGSTASH_ALL_ROLE);
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.waitForDocTableRendered();
    });

    test.afterAll(async ({ apiServices, kbnClient }) => {
      await apiServices.dataViews.deleteByTitle(NO_TIME_DATA_VIEW);
      await Promise.all([
        kbnClient.uiSettings.unset('defaultIndex'),
        kbnClient.uiSettings.unset('timepicker:timeDefaults'),
      ]);
      await kbnClient.importExport.unload(testData.DISCOVER_KBN_ARCHIVE);
      await kbnClient.savedObjects.cleanStandardList();
    });

    test('toggles sidebar, histogram, and table for a time-based data view', async ({
      page,
      pageObjects,
    }) => {
      await assertClassicPanelState({
        page,
        sidebarOpen: true,
        chartOpen: true,
        tableOpen: true,
        totalHits: '14,004',
      });

      await test.step('toggle the sidebar', async () => {
        await closeSidebar(page);
        await assertClassicPanelState({
          page,
          sidebarOpen: false,
          chartOpen: true,
          tableOpen: true,
          totalHits: '14,004',
        });

        await openSidebar(page);
        await assertClassicPanelState({
          page,
          sidebarOpen: true,
          chartOpen: true,
          tableOpen: true,
          totalHits: '14,004',
        });
      });

      await test.step('toggle the histogram panel', async () => {
        await pageObjects.discover.hideChart();
        await assertClassicPanelState({
          page,
          sidebarOpen: true,
          chartOpen: false,
          tableOpen: true,
          totalHits: '14,004',
        });
        expect(await isButtonDisabled(page, 'dscHideTableButton')).toBe(true);

        await pageObjects.discover.showChart();
        await assertClassicPanelState({
          page,
          sidebarOpen: true,
          chartOpen: true,
          tableOpen: true,
          totalHits: '14,004',
        });
      });

      await test.step('toggle the table panel', async () => {
        await closeTablePanel(page);
        await assertClassicPanelState({
          page,
          sidebarOpen: true,
          chartOpen: true,
          tableOpen: false,
          totalHits: '14,004',
        });
        expect(await isButtonDisabled(page, 'dscHideHistogramButton')).toBe(true);

        await openTablePanel(page);
        await assertClassicPanelState({
          page,
          sidebarOpen: true,
          chartOpen: true,
          tableOpen: true,
          totalHits: '14,004',
        });
      });

      await test.step('toggle sidebar and histogram together', async () => {
        await closeSidebar(page);
        await pageObjects.discover.hideChart();
        await assertClassicPanelState({
          page,
          sidebarOpen: false,
          chartOpen: false,
          tableOpen: true,
          totalHits: '14,004',
        });

        await openSidebar(page);
        await pageObjects.discover.showChart();
        await assertClassicPanelState({
          page,
          sidebarOpen: true,
          chartOpen: true,
          tableOpen: true,
          totalHits: '14,004',
        });
      });
    });

    test('toggles the sidebar for a non-time-based data view without chart controls', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.discover.selectDataView(NO_TIME_DATA_VIEW);
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.waitForDocTableRendered();

      await expect(hitCount(page)).toHaveText('14,004');
      await expect(page.testSubj.locator('fieldList')).toBeVisible();
      await expect(page.testSubj.locator('unifiedHistogramChart')).toHaveCount(0);
      await expect(page.testSubj.locator('discoverDocTable')).toBeVisible();
      await expect(page.testSubj.locator('dscPanelsToggleInHistogram')).toHaveCount(0);
      await expect(page.testSubj.locator('dscHideHistogramButton')).toHaveCount(0);
      await expect(page.testSubj.locator('dscShowHistogramButton')).toHaveCount(0);
      await expect(page.testSubj.locator('dscHideTableButton')).toHaveCount(0);
      await expect(page.testSubj.locator('dscShowTableButton')).toHaveCount(0);

      await closeSidebar(page);
      await expect(page.testSubj.locator('fieldList')).toHaveCount(0);
      await expect(page.testSubj.locator('dscShowSidebarButton')).toBeVisible();

      await openSidebar(page);
      await expect(page.testSubj.locator('fieldList')).toBeVisible();
      await expect(page.testSubj.locator('dscHideSidebarButton')).toBeVisible();
    });
  }
);
