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
  const inspector = getService('inspector');
  const filterBar = getService('filterBar');
  const testSubjects = getService('testSubjects');
  const { visualize, visEditor, visChart, timePicker } = getPageObjects([
    'visualize',
    'visEditor',
    'visChart',
    'timePicker',
  ]);

  async function initGaugeVis() {
    log.debug('navigateToApp visualize');
    await visualize.navigateToNewAggBasedVisualization();
    log.debug('clickGauge');
    await visualize.clickGauge();
    await visualize.clickNewSearch();
    await timePicker.setDefaultAbsoluteRange();
  }

  describe('gauge chart', function indexPatternCreation() {
    before(async () => {
      await visualize.initTests();
      await initGaugeVis();
    });

    it('should have inspector enabled', async function () {
      await inspector.expectIsEnabled();
    });

    it('should show Count', function () {
      const expectedCount = ['14,004', 'Count'];

      // initial metric of "Count" is selected by default
      return retry.try(async function tryingForTime() {
        const metricValue = await visChart.getGaugeValue();
        expect(expectedCount).to.eql(metricValue);
      });
    });

    it('should format the metric correctly in percentage mode', async function () {
      await visEditor.clickMetricEditor();
      await visEditor.selectAggregation('Average', 'metrics');
      await visEditor.selectField('bytes', 'metrics');
      await visEditor.clickOptionsTab();
      await testSubjects.setValue('gaugeColorRange2__to', '10000');
      await testSubjects.click('gaugePercentageMode');
      await testSubjects.setValue('gaugePercentageModeFormatPattern', '0.0%');
      await visChart.waitForVisualizationRenderingStabilized();
      await visEditor.clickGo(true);

      await retry.try(async function tryingForTime() {
        const expectedTexts = ['57.3%', 'Average bytes'];
        const metricValue = await visChart.getGaugeValue();
        expect(expectedTexts).to.eql(metricValue);
      });
    });

    describe('Split Gauges', () => {
      before(async () => {
        await initGaugeVis();
        log.debug('Bucket = Split Group');
        await visEditor.clickBucket('Split group');
        log.debug('Aggregation = Terms');
        await visEditor.selectAggregation('Terms');
        log.debug('Field = machine.os.raw');
        await visEditor.selectField('machine.os.raw');
        log.debug('Size = 4');
        await visEditor.setSize(4);
        await visEditor.clickGo(true);
      });

      it('should show Split Gauges', async () => {
        await retry.try(async () => {
          expect(await visChart.getGaugeValue()).to.eql([
            '2,904',
            'win 8',
            '2,858',
            'win xp',
            '2,814',
            'win 7',
            '2,784',
            'ios',
          ]);
        });
      });

      it('should add machine.os.raw:win 8 filter by click on the first Gauge', async () => {
        await visChart.clickOnGaugeByLabel('win 8');
        await visChart.waitForVisualizationRenderingStabilized();
        const hasFilter = await filterBar.hasFilter('machine.os.raw', 'win 8');

        expect(hasFilter).to.eql(true);
      });

      it('should show correct values for fields with fieldFormatters', async () => {
        await filterBar.removeAllFilters();
        const expectedTexts = ['2,904', 'win 8: Count', '0B', 'win 8: Min bytes'];

        await visEditor.selectAggregation('Terms');
        await visEditor.selectField('machine.os.raw');
        await visEditor.setSize(1);
        await visEditor.clickBucket('Metric', 'metrics');
        await visEditor.selectAggregation('Min', 'metrics');
        await visEditor.selectField('bytes', 'metrics');
        await visEditor.clickGo(true);

        await retry.try(async function tryingForTime() {
          const metricValue = await visChart.getGaugeValue();
          expect(expectedTexts).to.eql(metricValue);
        });
      });
    });
  });
}
