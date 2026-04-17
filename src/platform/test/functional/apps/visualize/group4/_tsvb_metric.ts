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
  const inspector = getService('inspector');
  const security = getService('security');
  const kibanaServer = getService('kibanaServer');

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

    describe('metric', () => {
      beforeEach(async () => {
        await visualBuilder.clickMetric();
        await visualBuilder.checkMetricTabIsPresent();
        await visualBuilder.clickPanelOptions('metric');
        await visualBuilder.setMetricsDataTimerangeMode('Last value');
        await visualBuilder.setDropLastBucket(true);
        await visualBuilder.clickDataTab('metric');
      });

      it('should have inspector enabled', async () => {
        await inspector.expectIsEnabled();
      });

      it('should show correct data', async () => {
        const value = await visualBuilder.getMetricValue();
        expect(value).to.eql('156');
      });

      it('should show correct data with Math Aggregation', async () => {
        await visualBuilder.createNewAgg();
        await visualBuilder.selectAggType('math', 1);
        await visualBuilder.fillInVariable();
        await visualBuilder.fillInExpression('params.test + 1');
        const value = await visualBuilder.getMetricValue();
        expect(value).to.eql('157');
      });

      it('should populate fields for basic functions', async () => {
        await visualBuilder.selectAggType('Average');
        await visualBuilder.setFieldForAggregation('machine.ram');
        const isFieldForAggregationValid = await visualBuilder.checkFieldForAggregationValidity();

        expect(isFieldForAggregationValid).to.be(true);
      });

      it('should show correct data for Value Count with Entire time range mode', async () => {
        await visualBuilder.selectAggType('Value Count');
        await visualBuilder.setFieldForAggregation('machine.ram');

        await visualBuilder.clickPanelOptions('metric');
        await visualBuilder.setMetricsDataTimerangeMode('Entire time range');

        const value = await visualBuilder.getMetricValue();
        expect(value).to.eql('13,492');
      });

      it('should show same data for kibana and string index pattern modes', async () => {
        await visualBuilder.selectAggType('Max');
        await visualBuilder.setFieldForAggregation('machine.ram');
        const kibanaIndexPatternModeValue = await visualBuilder.getMetricValue();

        await kibanaServer.uiSettings.update({ 'metrics:allowStringIndices': true });
        await browser.refresh();
        await visualBuilder.clickPanelOptions('metric');
        await visualBuilder.switchIndexPatternSelectionMode(false);
        const stringIndexPatternModeValue = await visualBuilder.getMetricValue();

        expect(kibanaIndexPatternModeValue).to.eql(stringIndexPatternModeValue);
        expect(kibanaIndexPatternModeValue).to.eql('32,212,254,720');
      });

      it('should show error if we use parent pipeline aggregations in entire time range mode', async () => {
        await visualBuilder.selectAggType('Max');
        await visualBuilder.setFieldForAggregation('machine.ram');
        await visualBuilder.createNewAgg();
        await visualBuilder.selectAggType('derivative', 1);
        await visualBuilder.setFieldForAggregation('Max of machine.ram', 1);

        await visChart.waitForVisualizationRenderingStabilized();
        const value = await visualBuilder.getMetricValue();

        expect(value).to.eql('0');

        await visualBuilder.clickPanelOptions('metric');
        await visualBuilder.setMetricsDataTimerangeMode('Entire time range');
        await visualBuilder.clickDataTab('metric');
        await visualBuilder.checkInvalidAggComponentIsPresent();
        const error = await visualBuilder.getVisualizeError();

        expect(error).to.eql(
          'The "derivative" aggregation is not supported for existing panel configuration.'
        );
      });

      describe('Color rules', () => {
        beforeEach(async () => {
          await visualBuilder.selectAggType('Min');
          await visualBuilder.setFieldForAggregation('machine.ram');

          await visualBuilder.clickPanelOptions('metric');
          await visualBuilder.setColorRuleOperator('>= greater than or equal');
          await visualBuilder.setColorRuleValue(0);
        });

        it('should apply color rules to visualization background', async () => {
          await visualBuilder.setColorPickerValue('#FFCFDF');

          const backGroundStyle = await visualBuilder.getBackgroundStyle();
          expect(backGroundStyle).to.eql('background-color: rgb(255, 207, 223);');
        });

        it('should apply color rules to metric value', async () => {
          await visualBuilder.setColorPickerValue('#AD7DE6', 1);

          const backGroundStyle = await visualBuilder.getMetricValueStyle();
          expect(backGroundStyle).to.eql('color: rgb(173, 125, 230);');
        });
      });

      describe('Top Hit aggregation', () => {
        beforeEach(async () => {
          await visualBuilder.selectAggType('Top Hit');
          await visualBuilder.setTopHitOrderByField('@timestamp');
        });

        it('should show correct data for string type field', async () => {
          await visualBuilder.setFieldForAggregation('machine.os.raw');
          await visualBuilder.setTopHitAggregateWithOption('Concatenate');

          const value = await visualBuilder.getMetricValue();
          expect(value).to.eql('win 7');
        });

        it('should show correct data for runtime field', async () => {
          await visualBuilder.setFieldForAggregation('hello_world_runtime_field');
          await visualBuilder.setTopHitAggregateWithOption('Concatenate');

          const value = await visualBuilder.getMetricValue();
          expect(value).to.eql('hello world');
        });
      });
    });
  });
}
