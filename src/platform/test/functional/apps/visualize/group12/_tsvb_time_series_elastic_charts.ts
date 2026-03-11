/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { visualize, visualBuilder } = getPageObjects(['visualBuilder', 'visualize']);
  const security = getService('security');

  describe('visual builder', function describeIndexTests() {
    before(async () => {
      await security.testUser.setRoles([
        'kibana_admin',
        'long_window_logstash',
        'test_logstash_reader',
      ]);
      await visualize.initTests();
    });
    beforeEach(async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisualBuilder();
      await visualBuilder.checkVisualBuilderIsPresent();
    });

    describe('Time Series', () => {
      beforeEach(async () => {
        await visualBuilder.setTime();
        await visualBuilder.clickPanelOptions('timeSeries');
        await visualBuilder.setDropLastBucket(true);
        await visualBuilder.clickDataTab('timeSeries');
      });

      describe('Elastic charts', function () {
        this.tags('skipFirefox');
        beforeEach(async () => {
          await visualBuilder.toggleNewChartsLibraryWithDebug(true);
          await visualBuilder.clickPanelOptions('timeSeries');
          await visualBuilder.setIntervalValue('12h');
          await visualBuilder.clickDataTab('timeSeries');
        });

        it('should display correct chart data for average aggregation', async () => {
          const expectedChartData = [
            [1442707200000, 5765.324917218543],
            [1442750400000, 5635.074754378471],
            [1442793600000, 5798.3942307692305],
            [1442836800000, 5721.522355975924],
            [1442880000000, 5639.770887166236],
          ];
          await visualBuilder.selectAggType('Average');
          await visualBuilder.setFieldForAggregation('bytes');

          const chartData = await visualBuilder.getAreaChartData();
          expect(chartData).to.eql(expectedChartData);
        });

        it('should display correct chart data for percentile aggregation', async () => {
          const expectedChartData = [
            [1442707200000, 157580],
            [1442750400000, 226400],
            [1442793600000, 200920],
            [1442836800000, 202320],
            [1442880000000, 171720],
          ];
          await visualBuilder.selectAggType('Percentile');
          await visualBuilder.setFieldForAggregation('Memory');

          const chartData = await visualBuilder.getAreaChartData();
          expect(chartData).to.eql(expectedChartData);
        });

        it('should display correct chart data, label names and area colors for sum aggregation when split by terms', async () => {
          const firstAreaExpectedChartData = [
            [1442620800000, 0],
            [1442664000000, 0],
            [1442707200000, 11121455],
            [1442750400000, 10611145],
            [1442793600000, 10511084],
            [1442836800000, 10512452],
            [1442880000000, 10444101],
          ];
          const secondAreaExpectedChartData = [
            [1442620800000, 0],
            [1442664000000, 0],
            [1442707200000, 2807570],
            [1442750400000, 2580565],
            [1442793600000, 2755642],
            [1442836800000, 2795809],
            [1442880000000, 2651447],
          ];
          await visualBuilder.selectAggType('Sum');
          await visualBuilder.setFieldForAggregation('bytes');
          await visualBuilder.setMetricsGroupByTerms('type');

          const chartDebugData = await visualBuilder.getChartDebugState();
          const areasCount = (await visualBuilder.getChartItems(chartDebugData))?.length;
          const legendNames = await visualBuilder.getLegendNames(chartDebugData);
          const areaColors = await visualBuilder.getAreaChartColors(chartDebugData);
          const firstAreaChartData = await visualBuilder.getAreaChartData(chartDebugData);
          const secondAreaChartData = await visualBuilder.getAreaChartData(chartDebugData, 1);

          expect(areasCount).to.be(2);
          expect(legendNames).to.eql(['apache', 'nginx']);
          // We need to use OR condition here because of how visColors are set inconsistently
          // See https://github.com/elastic/kibana/issues/206380
          const [firstColor, secondColor] = areaColors!;
          expect(firstColor).to.be('#16c5c0'); // first color in elastic palette
          expect(secondColor).to.be('#a6edea'); // second color in elastic palette
          expect(areaColors).to.length(2);
          expect(firstAreaChartData).to.eql(firstAreaExpectedChartData);
          expect(secondAreaChartData).to.eql(secondAreaExpectedChartData);
        });

        it('should display correct chart data, label names and area colors for min aggregation when split by filters', async () => {
          const firstAreaExpectedChartData = [
            [1442707200000, 219120],
            [1442750400000, 209840],
            [1442793600000, 200920],
            [1442836800000, 202320],
            [1442880000000, 201080],
          ];
          const secondAreaExpectedChartData = [
            [1442707200000, 293120],
            [1442750400000, 289960],
            [1442793600000, 297800],
            [1442836800000, 281040],
            [1442880000000, 282080],
          ];
          await visualBuilder.selectAggType('Min');
          await visualBuilder.setFieldForAggregation('memory');
          await visualBuilder.setMetricsGroupBy('filters');
          await visualBuilder.addGroupByFilterRow();
          await visualBuilder.setGroupByFilterQuery('bytes > 5000');
          await visualBuilder.setGroupByFilterQuery('bytes > 7000', 1);
          await visualBuilder.setGroupByFilterLabel('second', 1);
          await visualBuilder.setColorPickerValue('#00BCA3', 1);
          await visualBuilder.setColorPickerValue('#72CFC2', 2);

          const chartDebugData = await visualBuilder.getChartDebugState();
          const areasCount = (await visualBuilder.getChartItems(chartDebugData))?.length;
          const legendNames = await visualBuilder.getLegendNames(chartDebugData);
          const areaColors = await visualBuilder.getAreaChartColors(chartDebugData);
          const firstAreaChartData = await visualBuilder.getAreaChartData(chartDebugData);
          const secondAreaChartData = await visualBuilder.getAreaChartData(chartDebugData, 1);

          expect(areasCount).to.be(2);
          expect(legendNames).to.eql(['bytes > 5000', 'second']);
          expect(areaColors).to.eql(['rgba(0,188,163,1)', 'rgba(114,207,194,1)']);
          expect(firstAreaChartData).to.eql(firstAreaExpectedChartData);
          expect(secondAreaChartData).to.eql(secondAreaExpectedChartData);
        });

        it('should display cloned series and then change its chart type to bar', async () => {
          let areasCount = (await visualBuilder.getChartItems())?.length;
          expect(areasCount).to.be(1);

          await visualBuilder.cloneSeries();
          areasCount = (await visualBuilder.getChartItems())?.length;
          expect(areasCount).to.be(2);

          await visualBuilder.clickSeriesOption();
          await visualBuilder.setChartType('Bar');

          const chartDebugData = await visualBuilder.getChartDebugState();
          areasCount = (await visualBuilder.getChartItems(chartDebugData))?.length;
          const barsCount = (await visualBuilder.getChartItems(chartDebugData))?.length;
          expect(areasCount).to.be(1);
          expect(barsCount).to.be(1);
        });

        it('should display correct chart data for overridden index pattern', async () => {
          const expectedChartData = [
            [1442620800000, 4],
            [1442664000000, 3],
            [1442707200000, 5],
            [1442750400000, 2],
            [1442793600000, 6],
            [1442836800000, 1],
            [1442880000000, 6],
            [1442923200000, 1],
          ];
          await visualBuilder.clickSeriesOption();
          await visualBuilder.setOverrideIndexPattern(true);
          await visualBuilder.setIndexPatternValue('long-window-logstash-*');
          await visualBuilder.setIntervalValue('12h');

          const chartData = await visualBuilder.getAreaChartData();
          expect(chartData).to.eql(expectedChartData);
        });

        it('should display correct data for the selected interval', async () => {
          const expectedChartData = [
            [1442534400000, 0],
            [1442707200000, 9371],
          ];
          await visualBuilder.clickPanelOptions('timeSeries');
          await visualBuilder.setIntervalValue('2d');

          const chartDebugData = await visualBuilder.getChartDebugState();
          const title = await visualBuilder.getXAxisTitle(chartDebugData);
          const chartData = await visualBuilder.getAreaChartData(chartDebugData);

          expect(title).to.be('per 2 days');
          expect(chartData).to.eql(expectedChartData);
        });

        after(async () => await visualBuilder.toggleNewChartsLibraryWithDebug(false));
      });
    });
  });
}
