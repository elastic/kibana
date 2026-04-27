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

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const log = getService('log');
  const retry = getService('retry');
  const security = getService('security');
  const kibanaServer = getService('kibanaServer');

  const { visChart, visualBuilder, visualize, settings, common } = getPageObjects([
    'visChart',
    'visualBuilder',
    'visualize',
    'settings',
    'common',
  ]);

  const from = 'Sep 19, 2015 @ 06:31:44.000';
  const to = 'Sep 22, 2015 @ 18:31:44.000';

  describe('visual builder', function describeIndexTests() {
    before(async () => {
      await visualize.initTests();
      await common.setTime({ from, to });
    });

    after(async () => {
      await common.unsetTime();
    });

    beforeEach(async () => {
      await security.testUser.setRoles(
        ['kibana_admin', 'test_logstash_reader', 'kibana_sample_admin'],
        { skipBrowserRefresh: true }
      );

      await visualBuilder.resetPage();
    });

    describe('switch index pattern mode', () => {
      before(async () => {
        await kibanaServer.uiSettings.update({ 'metrics:allowStringIndices': true });
      });

      after(async () => {
        await kibanaServer.uiSettings.update({ 'metrics:allowStringIndices': false });
      });

      beforeEach(async () => {
        await visualBuilder.clickMetric();
        await visualBuilder.checkMetricTabIsPresent();
        await visualBuilder.clickPanelOptions('metric');
        await visualBuilder.setMetricsDataTimerangeMode('Last value');
        await visualBuilder.setDropLastBucket(true);
        await visualBuilder.clickDataTab('metric');
      });

      const switchIndexTest = async (useKibanaIndexes: boolean) => {
        await visualBuilder.clickPanelOptions('metric');

        // Sometimes popovers take some time to appear in Firefox (#71979)
        await retry.tryForTime(20000, async () => {
          await visualBuilder.setIndexPatternValue('logstash-*', useKibanaIndexes);
          await visualBuilder.waitForIndexPatternTimeFieldOptionsLoaded();
          await visualBuilder.selectIndexPatternTimeField('@timestamp');
        });
        const newValue = await visualBuilder.getMetricValue();
        expect(newValue).to.eql('156');
      };

      it('should be able to switch combo box mode selection', async () => {
        await switchIndexTest(true);
      });

      it('should be able to switch using text mode selection', async () => {
        await switchIndexTest(false);
      });
    });

    describe('switch panel interval test', () => {
      beforeEach(async () => {
        await visualBuilder.clickMetric();
        await visualBuilder.checkMetricTabIsPresent();
        await visualBuilder.clickPanelOptions('metric');
        await visualBuilder.setMetricsDataTimerangeMode('Last value');
        await visualBuilder.setDropLastBucket(true);
      });

      it('should be able to switch to gte interval (>=2d)', async () => {
        await visualBuilder.setIntervalValue('>=2d');
        const newValue = await visualBuilder.getMetricValue();
        expect(newValue).to.eql('9,371');
      });

      it('should be able to switch to fixed interval (1d)', async () => {
        await visualBuilder.setIntervalValue('1d');
        const newValue = await visualBuilder.getMetricValue();
        expect(newValue).to.eql('4,614');
      });

      it('should be able to switch to auto interval', async () => {
        await visualBuilder.setIntervalValue('auto');
        const newValue = await visualBuilder.getMetricValue();
        expect(newValue).to.eql('156');
      });
    });

    describe('browser history changes', () => {
      it('should activate previous/next chart tab and panel config', async () => {
        log.debug('Click metric chart');
        await visualBuilder.clickMetric();
        await visualBuilder.checkMetricTabIsPresent();
        await visualBuilder.checkTabIsSelected('metric');

        log.debug('Click Top N chart');
        await visualBuilder.clickTopN();
        await visualBuilder.checkTopNTabIsPresent();
        await visualBuilder.checkTabIsSelected('top_n');

        log.debug('Go back in browser history');
        await browser.goBack();

        log.debug('Check metric chart and panel config is rendered');
        await visualBuilder.checkMetricTabIsPresent();
        await visualBuilder.checkTabIsSelected('metric');
        await visualBuilder.checkPanelConfigIsPresent('metric');

        log.debug('Go back in browser history');
        await browser.goBack();

        log.debug('Check timeseries chart and panel config is rendered');
        await retry.try(async () => {
          await visualBuilder.checkTimeSeriesChartIsPresent();
          await visualBuilder.checkTabIsSelected('timeseries');
          await visualBuilder.checkPanelConfigIsPresent('timeseries');
        });

        log.debug('Go forward in browser history');
        await browser.goForward();

        log.debug('Check metric chart and panel config is rendered');
        await visualBuilder.checkMetricTabIsPresent();
        await visualBuilder.checkTabIsSelected('metric');
        await visualBuilder.checkPanelConfigIsPresent('metric');
      });

      it('should update panel config', async () => {
        const initialLegendItems = ['Count: 156'];
        const finalLegendItems = ['jpg: 106', 'css: 22', 'png: 14', 'gif: 8', 'php: 6'];

        log.debug('Group metrics by terms: extension.raw');
        await visualBuilder.clickPanelOptions('timeSeries');
        await visualBuilder.setDropLastBucket(true);
        await visualBuilder.clickDataTab('timeSeries');
        await visualBuilder.setMetricsGroupByTerms('extension.raw');
        await visChart.waitForVisualizationRenderingStabilized();
        const legendItems1 = await visualBuilder.getLegendItemsContent();
        expect(legendItems1).to.eql(finalLegendItems);

        log.debug('Go back in browser history');
        await browser.goBack();
        const isTermsSelected = await visualBuilder.checkSelectedMetricsGroupByValue('Terms');
        expect(isTermsSelected).to.be(true);

        log.debug('Go back in browser history');
        await browser.goBack();
        await visualBuilder.checkSelectedMetricsGroupByValue('Everything');
        await visChart.waitForVisualizationRenderingStabilized();
        const legendItems2 = await visualBuilder.getLegendItemsContent();
        expect(legendItems2).to.eql(initialLegendItems);

        log.debug('Go forward twice in browser history');
        await browser.goForward();
        await browser.goForward();
        await visChart.waitForVisualizationRenderingStabilized();
        const legendItems3 = await visualBuilder.getLegendItemsContent();
        expect(legendItems3).to.eql(finalLegendItems);
      });
    });

    describe('applying field formats from Advanced Settings', () => {
      const toggleSetFormatForMachineOsRaw = async () => {
        log.debug(
          'Navigate to Advanced Settings Index Patterns and toggle Set Format for machine.os.raw'
        );
        await settings.navigateTo();
        await settings.clickKibanaIndexPatterns();
        await settings.clickIndexPatternLogstash();
        await settings.openControlsByName('machine.os.raw');
        await settings.toggleRow('formatRow');
      };

      before(async () => {
        log.debug('Toggle on Set Format for machine.os.raw and set it to the title case');
        await toggleSetFormatForMachineOsRaw();
        await settings.setFieldFormat('string');
        await settings.setScriptedFieldStringTransform('title');
        await settings.controlChangeSave();
      });

      beforeEach(async () => {
        await visualBuilder.selectAggType('Average');
        await visualBuilder.setFieldForAggregation('bytes');
        await visualBuilder.setMetricsGroupByTerms('machine.os.raw');
        await visChart.waitForVisualizationRenderingStabilized();
      });

      it('should display title field formatted labels with byte field formatted values by default', async () => {
        const expectedLegendItems = [
          'Win 8: 4.968KB',
          'Win Xp: 4.23KB',
          'Win 7: 6.181KB',
          'Ios: 5.84KB',
          'Osx: 5.928KB',
        ];

        const legendItems = await visualBuilder.getLegendItemsContent();
        expect(legendItems).to.eql(expectedLegendItems);
      });

      it('should display title field formatted labels with raw values', async () => {
        const expectedLegendItems = [
          'Win 8: 5,087.5',
          'Win Xp: 4,332',
          'Win 7: 6,328.938',
          'Ios: 5,980',
          'Osx: 6,070',
        ];
        await visualBuilder.clickSeriesOption();
        await visualBuilder.changeDataFormatter('number');
        await visChart.waitForVisualizationRenderingStabilized();
        const legendItems = await visualBuilder.getLegendItemsContent();

        expect(legendItems).to.eql(expectedLegendItems);
      });

      it('should display title field formatted labels with TSVB formatted values', async () => {
        const expectedLegendItems = [
          'Win 8: 5,087.5 format',
          'Win Xp: 4,332 format',
          'Win 7: 6,328.938 format',
          'Ios: 5,980 format',
          'Osx: 6,070 format',
        ];

        await visualBuilder.clickSeriesOption();
        await visualBuilder.changeDataFormatter('number');
        await visualBuilder.enterSeriesTemplate('{{value}} format');
        await visChart.waitForVisualizationRenderingStabilized();

        const legendItems = await visualBuilder.getLegendItemsContent();
        expect(legendItems).to.eql(expectedLegendItems);
      });

      describe('formatting values for Metric, TopN and Gauge', () => {
        it('should display field formatted value for Metric', async () => {
          await visualBuilder.clickMetric();
          await visualBuilder.checkMetricTabIsPresent();

          const metricValue = await visualBuilder.getMetricValue();
          expect(metricValue).to.eql('5.514KB');
        });

        it('should display field formatted label and value for TopN', async () => {
          await visualBuilder.clickTopN();
          await visualBuilder.checkTopNTabIsPresent();

          await visChart.waitForVisualizationRenderingStabilized();
          const topNLabel = await visualBuilder.getTopNLabel();
          const topNCount = await visualBuilder.getTopNCount();

          expect(topNLabel).to.eql('Win 7');
          expect(topNCount).to.eql('5.664KB');
        });

        it('should display field formatted label and value for Gauge', async () => {
          await visualBuilder.clickGauge();
          await visualBuilder.checkGaugeTabIsPresent();

          await visChart.waitForVisualizationRenderingStabilized();
          const gaugeLabel = await visualBuilder.getGaugeLabel();
          const gaugeCount = await visualBuilder.getGaugeCount();

          expect(gaugeLabel).to.eql('Average of bytes');
          expect(gaugeCount).to.eql('5.514KB');
        });
      });

      after(async () => {
        log.debug('Toggle off Set Format for machine.os.raw');
        await toggleSetFormatForMachineOsRaw();
        await settings.controlChangeSave();
      });
    });
  });
}
