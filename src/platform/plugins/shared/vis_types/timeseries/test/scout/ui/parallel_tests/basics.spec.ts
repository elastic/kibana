/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import {
  cleanupTsvbSpace,
  openTimeSeriesEditor,
  setupTsvbSpace,
  spaceTest,
  testData,
} from '../fixtures';

spaceTest.describe('TSVB Time Series - basics', { tag: testData.TSVB_DEPLOYMENT_TAGS }, () => {
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

  spaceTest('renders the chart and its legend', async ({ pageObjects }) => {
    const { visualBuilder } = pageObjects;

    await expect(visualBuilder.timeSeriesChart).toBeVisible();
    await expect(visualBuilder.chartLegend).toBeVisible();
  });

  spaceTest('shows the correct count in the legend', async ({ pageObjects }) => {
    const { visualBuilder } = pageObjects;

    await expect.poll(() => visualBuilder.getLegendValue()).toBe('156');
  });

  spaceTest('shows the correct count in the legend with a 2h offset', async ({ pageObjects }) => {
    const { visualBuilder } = pageObjects;

    await visualBuilder.clickSeriesOption();
    await visualBuilder.enterOffsetSeries('2h');

    await expect.poll(() => visualBuilder.getLegendValue()).toBe('293');
  });

  spaceTest('shows the correct count in the legend with a -2h offset', async ({ pageObjects }) => {
    const { visualBuilder } = pageObjects;

    await visualBuilder.clickSeriesOption();
    await visualBuilder.enterOffsetSeries('-2h');

    await expect.poll(() => visualBuilder.getLegendValue()).toBe('53');
  });

  spaceTest(
    'opens the color picker, deactivates the panel and clones the series',
    async ({ pageObjects }) => {
      const { visualBuilder } = pageObjects;

      await spaceTest.step('open and close the series color picker', async () => {
        await visualBuilder.clickColorPicker();
        await expect(visualBuilder.colorPickerPopover).toBeVisible();
        await visualBuilder.clickColorPicker();
        await expect(visualBuilder.colorPickerPopover).toBeHidden();
      });

      await spaceTest.step('temporarily disable and re-enable the series', async () => {
        await visualBuilder.togglePanelPreview();
        await expect(visualBuilder.visualizationError).toBeVisible();
        await visualBuilder.togglePanelPreview();
        await expect(visualBuilder.visualizationError).toBeHidden();
      });

      await spaceTest.step('clone the series', async () => {
        await visualBuilder.cloneSeries();
        await expect(visualBuilder.seriesEditors).toHaveCount(2);
        await expect(visualBuilder.legendItems).toHaveCount(2);
      });
    }
  );
});
