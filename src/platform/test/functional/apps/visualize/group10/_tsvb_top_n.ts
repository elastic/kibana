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

    describe('topN', () => {
      beforeEach(async () => {
        await visualBuilder.clickTopN();
        await visualBuilder.checkTopNTabIsPresent();
        await visualBuilder.clickPanelOptions('topN');
        await visualBuilder.setMetricsDataTimerangeMode('Last value');
        await visualBuilder.setDropLastBucket(true);
        await visualBuilder.clickDataTab('topN');
      });

      it('should verify topN label and count display', async () => {
        await visChart.waitForVisualizationRenderingStabilized();
        const topNLabel = await visualBuilder.getTopNLabel();
        const topNCount = await visualBuilder.getTopNCount();
        expect(topNLabel).to.be('Count');
        expect(topNCount).to.be('156');
      });

      it('should display correct data for counter rate aggregation with last value time range mode', async () => {
        await visualBuilder.selectAggType('Counter rate');
        await visualBuilder.setFieldForAggregation('memory');

        const topNLabel = await visualBuilder.getTopNLabel();
        const topNCount = await visualBuilder.getTopNCount();

        expect(topNLabel).to.be('Counter Rate of memory');
        expect(topNCount).to.be('29,520');
      });

      it('should display correct data for sum of squares aggregation with entire time range mode', async () => {
        await visualBuilder.selectAggType('Sum of squares');
        await visualBuilder.setFieldForAggregation('bytes');
        await visualBuilder.clickSeriesOption();
        await visualBuilder.changeDataFormatter('number');
        await visualBuilder.clickPanelOptions('topN');
        await visualBuilder.setMetricsDataTimerangeMode('Entire time range');

        const topNLabel = await visualBuilder.getTopNLabel();
        const topNCount = await visualBuilder.getTopNCount();

        expect(topNLabel).to.be('Sum of Squares of bytes');
        expect(topNCount).to.be('630,170,001,503');
      });

      it('should apply series color to bar', async () => {
        await visualBuilder.cloneSeries();
        await visualBuilder.setColorPickerValue('#E5FFCF');
        await visualBuilder.setColorPickerValue('#80e08a', 1);

        const firstTopNBarStyle = await visualBuilder.getTopNBarStyle();
        const secondTopNBarStyle = await visualBuilder.getTopNBarStyle(1);

        expect(firstTopNBarStyle).to.contain('background-color: rgb(229, 255, 207);');
        expect(secondTopNBarStyle).to.contain('background-color: rgb(128, 224, 138);');
      });

      it('should show error if we use parent pipeline aggregations in entire time range mode', async () => {
        await visualBuilder.selectAggType('Max');
        await visualBuilder.setFieldForAggregation('machine.ram');
        await visualBuilder.createNewAgg();
        await visualBuilder.selectAggType('derivative', 1);
        await visualBuilder.setFieldForAggregation('Max of machine.ram', 1);

        await visChart.waitForVisualizationRenderingStabilized();
        const value = await visualBuilder.getTopNCount();

        expect(value).to.eql('0');

        await visualBuilder.clickPanelOptions('topN');
        await visualBuilder.setMetricsDataTimerangeMode('Entire time range');
        await visualBuilder.clickDataTab('topN');
        await visualBuilder.checkInvalidAggComponentIsPresent();
        const error = await visualBuilder.getVisualizeError();

        expect(error).to.eql(
          'The "derivative" aggregation is not supported for existing panel configuration.'
        );
      });

      describe('Color rules', () => {
        it('should apply color rules to visualization background and bar', async () => {
          await visualBuilder.selectAggType('Value Count');
          await visualBuilder.setFieldForAggregation('machine.ram');
          await visualBuilder.clickPanelOptions('topN');
          await visualBuilder.setColorRuleOperator('<= less than or equal');
          await visualBuilder.setColorRuleValue(153);
          await visualBuilder.setBackgroundColor('#FBFFD4');
          await visualBuilder.setColorPickerValue('#D6BF57', 1);

          const backGroundStyle = await visualBuilder.getBackgroundStyle();
          const topNBarStyle = await visualBuilder.getTopNBarStyle();

          expect(backGroundStyle).to.eql('background-color: rgb(251, 255, 212);');
          expect(topNBarStyle).to.contain('background-color: rgb(214, 191, 87);');
        });
      });
    });
  });
}
