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
  CHART_POLL_OPTIONS,
  cleanupTsvbSpace,
  enableElasticChartDebug,
  getAreasCount,
  getLegendNames,
  openTimeSeriesEditor,
  setupTsvbSpace,
  spaceTest,
  testData,
} from '../fixtures';
import type { VisualBuilder } from '../fixtures/page_objects';

const expectVisibleLegendNames = async (
  visualBuilder: VisualBuilder,
  expectedNames: string[]
): Promise<void> => {
  await expect
    .poll(async () => getLegendNames(await visualBuilder.getChartDebugState()), CHART_POLL_OPTIONS)
    .toStrictEqual(expectedNames);
};

spaceTest.describe('TSVB Time Series - hiding series', { tag: testData.DEPLOYMENT_TAGS }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await setupTsvbSpace(scoutSpace);
  });

  spaceTest.beforeEach(async ({ browserAuth, context, pageObjects }) => {
    // Has to run before the app is loaded: the chart reads the flag while mounting.
    await enableElasticChartDebug(context);
    await browserAuth.loginAsPrivilegedUser();

    const { visualBuilder } = pageObjects;
    await openTimeSeriesEditor(pageObjects);
    await visualBuilder.clickPanelOptions('timeSeries');
    await visualBuilder.setIntervalValue('12h');
    await visualBuilder.clickDataTab('timeSeries');
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await cleanupTsvbSpace(scoutSpace);
  });

  spaceTest('hides series on legend item click', async ({ pageObjects }) => {
    const { visualBuilder } = pageObjects;

    await visualBuilder.setMetricsGroupByTerms('@tags.raw');

    await expect
      .poll(async () => getAreasCount(await visualBuilder.getChartDebugState()), CHART_POLL_OPTIONS)
      .toBe(6);

    // Clicking a legend item isolates its series, so only the clicked ones stay visible.
    await visualBuilder.clickSeriesLegendItem('success');
    await visualBuilder.clickSeriesLegendItem('info');
    await visualBuilder.clickSeriesLegendItem('error');

    await expect
      .poll(async () => getAreasCount(await visualBuilder.getChartDebugState()), CHART_POLL_OPTIONS)
      .toBe(3);
  });

  spaceTest('keeps series hidden after a refresh', async ({ pageObjects }) => {
    const { visualBuilder } = pageObjects;

    await visualBuilder.setMetricsGroupByTerms('extension.raw');
    await expectVisibleLegendNames(visualBuilder, ['jpg', 'css', 'png', 'gif', 'php']);

    await visualBuilder.clickSeriesLegendItem('png');
    await visualBuilder.clickSeriesLegendItem('php');
    await expectVisibleLegendNames(visualBuilder, ['png', 'php']);

    await visualBuilder.refresh();
    await expectVisibleLegendNames(visualBuilder, ['png', 'php']);
  });
});
