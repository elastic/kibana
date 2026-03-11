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
  const security = getService('security');

  const { visChart, visualBuilder, visualize, common } = getPageObjects([
    'visChart',
    'visualBuilder',
    'visualize',
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

    describe('gauge', () => {
      beforeEach(async () => {
        await visualBuilder.clickGauge();
        await visualBuilder.checkGaugeTabIsPresent();
      });

      it('should "Entire time range" selected as timerange mode for new visualization', async () => {
        await visualBuilder.clickPanelOptions('gauge');
        await visualBuilder.checkSelectedDataTimerangeMode('Entire time range');
        await visualBuilder.clickDataTab('gauge');
      });

      it('should show error if we use parent pipeline aggregations in entire time range mode', async () => {
        await visualBuilder.clickPanelOptions('gauge');
        await visualBuilder.setMetricsDataTimerangeMode('Last value');
        await visualBuilder.clickDataTab('gauge');
        await visualBuilder.selectAggType('Max');
        await visualBuilder.setFieldForAggregation('machine.ram');
        await visualBuilder.createNewAgg();
        await visualBuilder.selectAggType('derivative', 1);
        await visualBuilder.setFieldForAggregation('Max of machine.ram', 1);

        await visChart.waitForVisualizationRenderingStabilized();
        const value = await visualBuilder.getGaugeCount();

        expect(value).to.eql('0');

        await visualBuilder.clickPanelOptions('gauge');
        await visualBuilder.setMetricsDataTimerangeMode('Entire time range');
        await visualBuilder.clickDataTab('gauge');
        await visualBuilder.checkInvalidAggComponentIsPresent();
        const error = await visualBuilder.getVisualizeError();

        expect(error).to.eql(
          'The "derivative" aggregation is not supported for existing panel configuration.'
        );
      });

      it('should verify gauge label and count display', async () => {
        await visChart.waitForVisualizationRenderingStabilized();
        const gaugeLabel = await visualBuilder.getGaugeLabel();
        const gaugeCount = await visualBuilder.getGaugeCount();
        expect(gaugeLabel).to.be('Count');
        expect(gaugeCount).to.be('13,830');
      });

      it('should display correct data for max aggregation with entire time range mode', async () => {
        await visualBuilder.selectAggType('Max');
        await visualBuilder.setFieldForAggregation('bytes');
        await visualBuilder.clickSeriesOption();
        await visualBuilder.changeDataFormatter('number');

        await visChart.waitForVisualizationRenderingStabilized();
        const gaugeLabel = await visualBuilder.getGaugeLabel();
        const gaugeCount = await visualBuilder.getGaugeCount();

        expect(gaugeLabel).to.be('Max of bytes');
        expect(gaugeCount).to.be('19,986');
      });

      it('should display correct data for sum aggregation with last value time range mode', async () => {
        await visualBuilder.selectAggType('Sum');
        await visualBuilder.setFieldForAggregation('memory');
        await visualBuilder.clickPanelOptions('gauge');
        await visualBuilder.setMetricsDataTimerangeMode('Last value');

        await visChart.waitForVisualizationRenderingStabilized();
        const gaugeLabel = await visualBuilder.getGaugeLabel();
        const gaugeCount = await visualBuilder.getGaugeCount();

        expect(gaugeLabel).to.be('Sum of memory');
        expect(gaugeCount).to.be('672,320');
      });

      it('should apply series color to gauge', async () => {
        await visualBuilder.setColorPickerValue('#90CEEAFF');

        const gaugeColor = await visualBuilder.getGaugeColor();
        expect(gaugeColor).to.be('#90ceea');
      });

      describe('Color rules', () => {
        it('should apply color rules to visualization background and inner gauge circle', async () => {
          await visualBuilder.selectAggType('Filter Ratio');
          await visualBuilder.setFilterRatioOption('Numerator', 'bytes < 0');
          await visualBuilder.clickPanelOptions('gauge');
          await visualBuilder.setColorRuleOperator('< less than');
          await visualBuilder.setColorRuleValue(21);
          await visualBuilder.setBackgroundColor('#FFCFDF');
          await visualBuilder.setColorPickerValue('#AD7DE6', 1);

          const backGroundStyle = await visualBuilder.getBackgroundStyle();
          const gaugeInnerColor = await visualBuilder.getGaugeColor(true);

          expect(backGroundStyle).to.eql('background-color: rgb(255, 207, 223);');
          expect(gaugeInnerColor).to.eql('rgba(173,125,230,1)');
        });

        it('should apply color rules to gauge and its value', async () => {
          await visualBuilder.selectAggType('Cardinality');
          await visualBuilder.setFieldForAggregation('machine.ram');
          await visualBuilder.clickPanelOptions('gauge');
          await visualBuilder.setColorRuleOperator('>= greater than or equal');
          await visualBuilder.setColorRuleValue(20);
          await visualBuilder.setColorPickerValue('#54B399', 2);
          await visualBuilder.setColorPickerValue('#DA8B45', 3);

          const gaugeColor = await visualBuilder.getGaugeColor();
          const gaugeValueStyle = await visualBuilder.getGaugeValueStyle();

          expect(gaugeColor).to.be('rgba(84,179,153,1)');
          expect(gaugeValueStyle).to.eql('color: rgb(218, 139, 69);');
        });
      });
    });
  });
}
