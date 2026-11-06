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
  getAreaChartColors,
  getAreaChartData,
  getAreasCount,
  getBarsCount,
  getLegendNames,
  getXAxisTitle,
  openTimeSeriesEditor,
  setupTsvbSpace,
  spaceTest,
  testData,
} from '../fixtures';
import type { ChartDataPoint } from '../fixtures';
import type { VisualBuilder } from '../fixtures/page_objects';

const expectAreaChartData = async (
  visualBuilder: VisualBuilder,
  expectedChartData: ChartDataPoint[],
  nth = 0
) => {
  await expect
    .poll(
      async () => getAreaChartData(await visualBuilder.getChartDebugState(), nth),
      CHART_POLL_OPTIONS
    )
    .toStrictEqual(expectedChartData);
};

const expectAreasCount = async (visualBuilder: VisualBuilder, expectedCount: number) => {
  await expect
    .poll(async () => getAreasCount(await visualBuilder.getChartDebugState()), CHART_POLL_OPTIONS)
    .toBe(expectedCount);
};

spaceTest.describe('TSVB Time Series - chart data', { tag: testData.TSVB_DEPLOYMENT_TAGS }, () => {
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

  spaceTest('displays the correct data for an average aggregation', async ({ pageObjects }) => {
    const { visualBuilder } = pageObjects;

    await visualBuilder.selectAggType('Average');
    await visualBuilder.setFieldForAggregation('bytes');

    await expectAreaChartData(visualBuilder, [
      [1442707200000, 5765.324917218543],
      [1442750400000, 5635.074754378471],
      [1442793600000, 5798.3942307692305],
      [1442836800000, 5721.522355975924],
      [1442880000000, 5639.770887166236],
    ]);
  });

  spaceTest('displays the correct data for a percentile aggregation', async ({ pageObjects }) => {
    const { visualBuilder } = pageObjects;

    await visualBuilder.selectAggType('Percentile');
    await visualBuilder.setFieldForAggregation('memory');

    await expectAreaChartData(visualBuilder, [
      [1442707200000, 157580],
      [1442750400000, 226400],
      [1442793600000, 200920],
      [1442836800000, 202320],
      [1442880000000, 171720],
    ]);
  });

  spaceTest(
    'displays the correct data, labels and colors for a sum aggregation split by terms',
    async ({ pageObjects }) => {
      const { visualBuilder } = pageObjects;

      await visualBuilder.selectAggType('Sum');
      await visualBuilder.setFieldForAggregation('bytes');
      await visualBuilder.setMetricsGroupByTerms('type');

      // Gate on the split having been applied before reading the rest of the state.
      await expectAreasCount(visualBuilder, 2);

      const debugState = await visualBuilder.getChartDebugState();
      expect(getLegendNames(debugState)).toStrictEqual(['apache', 'nginx']);
      // The first two colors of the elastic palette.
      expect(getAreaChartColors(debugState)).toStrictEqual(['#16c5c0', '#a6edea']);
      expect(getAreaChartData(debugState)).toStrictEqual([
        [1442620800000, 0],
        [1442664000000, 0],
        [1442707200000, 11121455],
        [1442750400000, 10611145],
        [1442793600000, 10511084],
        [1442836800000, 10512452],
        [1442880000000, 10444101],
      ]);
      expect(getAreaChartData(debugState, 1)).toStrictEqual([
        [1442620800000, 0],
        [1442664000000, 0],
        [1442707200000, 2807570],
        [1442750400000, 2580565],
        [1442793600000, 2755642],
        [1442836800000, 2795809],
        [1442880000000, 2651447],
      ]);
    }
  );

  spaceTest(
    'displays the correct data, labels and colors for a min aggregation split by filters',
    async ({ pageObjects }) => {
      const { visualBuilder } = pageObjects;

      await visualBuilder.selectAggType('Min');
      await visualBuilder.setFieldForAggregation('memory');
      await visualBuilder.setMetricsGroupBy('Filters');
      await visualBuilder.addGroupByFilterRow();
      await visualBuilder.setGroupByFilterQuery('bytes > 5000');
      await visualBuilder.setGroupByFilterQuery('bytes > 7000', 1);
      await visualBuilder.setGroupByFilterLabel('second', 1);
      // The series color picker comes first, the two filter rows follow.
      await visualBuilder.setColorPickerValue('#00BCA3', 1);
      await visualBuilder.setColorPickerValue('#72CFC2', 2);

      // Gate on the colors having been applied before reading the rest of the state.
      await expect
        .poll(
          async () => getAreaChartColors(await visualBuilder.getChartDebugState()),
          CHART_POLL_OPTIONS
        )
        .toStrictEqual(['rgba(0,188,163,1)', 'rgba(114,207,194,1)']);

      const debugState = await visualBuilder.getChartDebugState();
      expect(getLegendNames(debugState)).toStrictEqual(['bytes > 5000', 'second']);
      expect(getAreaChartData(debugState)).toStrictEqual([
        [1442707200000, 219120],
        [1442750400000, 209840],
        [1442793600000, 200920],
        [1442836800000, 202320],
        [1442880000000, 201080],
      ]);
      expect(getAreaChartData(debugState, 1)).toStrictEqual([
        [1442707200000, 293120],
        [1442750400000, 289960],
        [1442793600000, 297800],
        [1442836800000, 281040],
        [1442880000000, 282080],
      ]);
    }
  );

  spaceTest('renders a cloned series and turns it into a bar', async ({ pageObjects }) => {
    const { visualBuilder } = pageObjects;

    await expectAreasCount(visualBuilder, 1);

    await visualBuilder.cloneSeries();
    await expectAreasCount(visualBuilder, 2);

    await visualBuilder.clickSeriesOption();
    await visualBuilder.setChartType('Bar');

    await expect
      .poll(async () => {
        const debugState = await visualBuilder.getChartDebugState();
        return { areas: getAreasCount(debugState), bars: getBarsCount(debugState) };
      }, CHART_POLL_OPTIONS)
      .toStrictEqual({ areas: 1, bars: 1 });
  });

  spaceTest('displays the correct data for an overridden data view', async ({ pageObjects }) => {
    const { visualBuilder } = pageObjects;

    await visualBuilder.clickSeriesOption();
    await visualBuilder.setOverrideIndexPattern(true);
    await visualBuilder.setIndexPatternValue(testData.DATA_VIEW_TITLE.LONG_WINDOW_LOGSTASH);
    await visualBuilder.setIntervalValue('12h');

    await expectAreaChartData(visualBuilder, [
      [1442620800000, 4],
      [1442664000000, 3],
      [1442707200000, 5],
      [1442750400000, 2],
      [1442793600000, 6],
      [1442836800000, 1],
      [1442880000000, 6],
      [1442923200000, 1],
    ]);
  });

  spaceTest('displays the correct data for the selected interval', async ({ pageObjects }) => {
    const { visualBuilder } = pageObjects;

    await visualBuilder.clickPanelOptions('timeSeries');
    await visualBuilder.setIntervalValue('2d');

    await expect
      .poll(async () => getXAxisTitle(await visualBuilder.getChartDebugState()), CHART_POLL_OPTIONS)
      .toBe('per 2 days');

    const debugState = await visualBuilder.getChartDebugState();
    expect(getAreaChartData(debugState)).toStrictEqual([
      [1442534400000, 0],
      [1442707200000, 9371],
    ]);
  });

  spaceTest('displays the correct data for an applied series filter', async ({ pageObjects }) => {
    const { visualBuilder } = pageObjects;

    await visualBuilder.clickSeriesOption();
    await visualBuilder.setSeriesFilter('machine.os.raw : "win 7" and bytes > 10000');

    await expectAreaChartData(visualBuilder, [
      [1442620800000, 0],
      [1442664000000, 0],
      [1442707200000, 31],
      [1442750400000, 24],
      [1442793600000, 27],
      [1442836800000, 22],
      [1442880000000, 24],
    ]);
  });

  spaceTest('displays the correct data for an applied panel filter', async ({ pageObjects }) => {
    const { visualBuilder } = pageObjects;

    await visualBuilder.clickPanelOptions('timeSeries');
    await visualBuilder.setPanelFilter('machine.os.raw: "ios"');

    await expectAreaChartData(visualBuilder, [
      [1442620800000, 0],
      [1442664000000, 0],
      [1442707200000, 472],
      [1442750400000, 474],
      [1442793600000, 450],
      [1442836800000, 439],
      [1442880000000, 458],
    ]);
  });
});
