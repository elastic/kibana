/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const filterBar = getService('filterBar');
  const inspector = getService('inspector');
  const { visualize, visEditor, visChart, timePicker } = getPageObjects([
    'visualize',
    'visEditor',
    'visChart',
    'timePicker',
  ]);

  describe('metric chart', function () {
    before(async function () {
      await visualize.initTests();
      log.debug('navigateToApp visualize');
      await visualize.navigateToNewAggBasedVisualization();
      log.debug('clickMetric');
      await visualize.clickMetric();
      await visualize.clickNewSearch();
      await timePicker.setDefaultAbsoluteRange();
    });

    it('should have inspector enabled', async function () {
      await inspector.expectIsEnabled();
    });

    it('should show Count', async function () {
      const expectedCount = ['14,004', 'Count'];

      // initial metric of "Count" is selected by default
      await retry.try(async function tryingForTime() {
        const metricValue = await visChart.getMetric();
        expect(expectedCount).to.eql(metricValue);
      });
    });

    it('should show Average', async function () {
      const avgMachineRam = ['13,104,036,080.615', 'Average machine.ram'];
      await visEditor.clickMetricEditor();
      log.debug('Aggregation = Average');
      await visEditor.selectAggregation('Average', 'metrics');
      log.debug('Field = machine.ram');
      await visEditor.selectField('machine.ram', 'metrics');
      await visEditor.clickGo();
      await retry.try(async function tryingForTime() {
        const metricValue = await visChart.getMetric();
        expect(avgMachineRam).to.eql(metricValue);
      });
    });

    it('should show Sum', async function () {
      const sumPhpMemory = ['85,865,880', 'Sum of phpmemory'];
      log.debug('Aggregation = Sum');
      await visEditor.selectAggregation('Sum', 'metrics');
      log.debug('Field = phpmemory');
      await visEditor.selectField('phpmemory', 'metrics');
      await visEditor.clickGo();
      await retry.try(async function tryingForTime() {
        const metricValue = await visChart.getMetric();
        expect(sumPhpMemory).to.eql(metricValue);
      });
    });

    it('should show Median', async function () {
      const medianBytes = ['5,565.263', 'Median bytes'];
      //  For now, only comparing the text label part of the metric
      log.debug('Aggregation = Median');
      await visEditor.selectAggregation('Median', 'metrics');
      log.debug('Field = bytes');
      await visEditor.selectField('bytes', 'metrics');
      await visEditor.clickGo();
      await retry.try(async function tryingForTime() {
        const metricValue = await visChart.getMetric();
        // only comparing the text label!
        expect(medianBytes[1]).to.eql(metricValue[1]);
      });
    });

    it('should show Min', async function () {
      const minTimestamp = ['Sep 20, 2015 @ 00:00:00.000', 'Min @timestamp'];
      log.debug('Aggregation = Min');
      await visEditor.selectAggregation('Min', 'metrics');
      log.debug('Field = @timestamp');
      await visEditor.selectField('@timestamp', 'metrics');
      await visEditor.clickGo();
      await retry.try(async function tryingForTime() {
        const metricValue = await visChart.getMetric();
        expect(minTimestamp).to.eql(metricValue);
      });
    });

    it('should show Max', async function () {
      const maxRelatedContentArticleModifiedTime = [
        'Apr 4, 2015 @ 00:54:41.000',
        'Max relatedContent.article:modified_time',
      ];
      log.debug('Aggregation = Max');
      await visEditor.selectAggregation('Max', 'metrics');
      log.debug('Field = relatedContent.article:modified_time');
      await visEditor.selectField('relatedContent.article:modified_time', 'metrics');
      await visEditor.clickGo();
      await retry.try(async function tryingForTime() {
        const metricValue = await visChart.getMetric();
        expect(maxRelatedContentArticleModifiedTime).to.eql(metricValue);
      });
    });

    it('should show Unique Count', async function () {
      const uniqueCountClientip = ['1,000', 'Unique count of clientip'];
      log.debug('Aggregation = Unique Count');
      await visEditor.selectAggregation('Unique Count', 'metrics');
      log.debug('Field = clientip');
      await visEditor.selectField('clientip', 'metrics');
      await visEditor.clickGo();
      await retry.try(async function tryingForTime() {
        const metricValue = await visChart.getMetric();
        expect(uniqueCountClientip).to.eql(metricValue);
      });
    });

    it('should show Percentiles', async function () {
      const percentileMachineRam = [
        '2,147,483,648',
        '1st percentile of machine.ram',
        '3,221,225,472',
        '5th percentile of machine.ram',
        '7,516,192,768',
        '25th percentile of machine.ram',
        '12,884,901,888',
        '50th percentile of machine.ram',
        '18,253,611,008',
        '75th percentile of machine.ram',
        '32,212,254,720',
        '95th percentile of machine.ram',
        '32,212,254,720',
        '99th percentile of machine.ram',
      ];

      log.debug('Aggregation = Percentiles');
      await visEditor.selectAggregation('Percentiles', 'metrics');
      log.debug('Field =  machine.ram');
      await visEditor.selectField('machine.ram', 'metrics');
      await visEditor.toggleAdvancedParams('1');
      await visEditor.inputValueInCodeEditor('{ "tdigest": { "compression": 1000 } }');
      await visEditor.clickGo();
      await retry.try(async function tryingForTime() {
        const metricValue = await visChart.getMetric();
        expect(percentileMachineRam).to.eql(metricValue);
      });
    });

    it('should show Percentile Ranks', async function () {
      const percentileRankBytes = ['2.036%', 'Percentile rank 99 of "memory"'];
      log.debug('Aggregation = Percentile Ranks');
      await visEditor.selectAggregation('Percentile Ranks', 'metrics');
      log.debug('Field =  bytes');
      await visEditor.selectField('memory', 'metrics');
      log.debug('Values =  99');
      await visEditor.setValue('99');
      await visEditor.clickGo();
      await retry.try(async function tryingForTime() {
        const metricValue = await visChart.getMetric();
        expect(percentileRankBytes).to.eql(metricValue);
      });
    });

    describe('with filters', function () {
      it('should allow filtering with buckets', async function () {
        log.debug('Bucket = Split Group');
        await visEditor.clickBucket('Split group');
        log.debug('Aggregation = Terms');
        await visEditor.selectAggregation('Terms');
        log.debug('Field = machine.os.raw');
        await visEditor.selectField('machine.os.raw');
        await visEditor.clickGo();

        let filterCount = 0;
        await retry.try(async function tryingForTime() {
          // click first metric bucket
          await visEditor.clickMetricByIndex(0);
          await visChart.waitForVisualizationRenderingStabilized();
          filterCount = await filterBar.getFilterCount();
        });
        await filterBar.removeAllFilters();
        expect(filterCount).to.equal(1);
      });
    });
  });
}
