/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { TimeseriesPageObjects } from '../fixtures/page_objects';
import {
  cleanupTsvbSpace,
  openTimeSeriesEditor,
  setupTsvbSpace,
  spaceTest,
  testData,
} from '../fixtures';

/**
 * Saves the visualization to a new dashboard, clicks the chart at `clickOffset`
 * (relative to the canvas centre, matching the coordinates of the migrated FTR
 * suite) and applies the filter the click suggests.
 */
const saveAndClickChart = async (
  page: ScoutPage,
  pageObjects: TimeseriesPageObjects,
  visName: string,
  clickOffset: { x: number; y: number }
) => {
  const { dashboard, visualBuilder, visualize } = pageObjects;

  await visualize.saveToNewDashboard(visName);
  await dashboard.waitForRenderComplete();

  const canvasBox = await visualBuilder.chartCanvas.boundingBox();
  if (!canvasBox) {
    throw new Error('The chart canvas has no layout, so it cannot be clicked');
  }
  // Playwright positions a click from the top left corner of the element.
  await visualBuilder.chartCanvas.click({
    position: {
      x: canvasBox.width / 2 + clickOffset.x,
      y: canvasBox.height / 2 + clickOffset.y,
    },
  });

  const applyFiltersButton = page.testSubj.locator('applyFiltersPopoverButton');
  await expect(applyFiltersButton).toBeVisible();
  await applyFiltersButton.click();
  await dashboard.waitForRenderComplete();
};

spaceTest.describe(
  'TSVB Time Series - clicking on the chart',
  { tag: testData.DEPLOYMENT_TAGS },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await setupTsvbSpace(scoutSpace);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await openTimeSeriesEditor(pageObjects);
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await cleanupTsvbSpace(scoutSpace);
    });

    spaceTest('creates a filter', async ({ page, pageObjects }) => {
      const { filterBar, visualBuilder } = pageObjects;

      await visualBuilder.setMetricsGroupByTerms('machine.os.raw', {
        include: 'win 7',
        exclude: 'ios',
      });

      await saveAndClickChart(page, pageObjects, 'vis_1', { x: 143, y: 123 });

      await expect
        .poll(() => filterBar.hasFilter({ field: 'machine.os.raw', value: 'win 7' }))
        .toBe(true);
    });

    spaceTest(
      'creates a filter for a series split by several terms fields, one of which is formatted',
      async ({ page, pageObjects }) => {
        const { filterBar, visualBuilder } = pageObjects;

        await visualBuilder.setMetricsGroupByTerms('bytes');
        await visualBuilder.setAnotherGroupByTermsField('machine.os.raw');
        await visualBuilder.clickSeriesOption();
        await visualBuilder.setChartType('Bar');
        await visualBuilder.clickPanelOptions('timeSeries');
        await visualBuilder.setIntervalValue('1w');

        await saveAndClickChart(page, pageObjects, 'vis_2', { x: -130, y: 10 });

        await expect.poll(() => filterBar.getFiltersLabel()).toStrictEqual(['0, win 7']);
      }
    );
  }
);
