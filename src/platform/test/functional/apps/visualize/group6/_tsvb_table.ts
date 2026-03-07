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
  const { visualBuilder, visualize, visChart, settings } = getPageObjects([
    'visualBuilder',
    'visualize',
    'visChart',
    'settings',
  ]);
  const findService = getService('find');
  const retry = getService('retry');

  // Failing: See https://github.com/elastic/kibana/issues/253005
  describe.skip('visual builder', function describeIndexTests() {
    before(async () => {
      await visualize.initTests();
    });
    describe('table', () => {
      beforeEach(async () => {
        await visualBuilder.resetPage('Sep 22, 2015 @ 06:00:00.000', 'Sep 22, 2015 @ 11:00:00.000');
        await visualBuilder.clickTable();

        await visualBuilder.checkTableTabIsPresent();
        await visualBuilder.clickPanelOptions('table');
        await visualBuilder.setMetricsDataTimerangeMode('Last value');
        await visualBuilder.setDropLastBucket(true);
        await visualBuilder.clickDataTab('table');
        await visualBuilder.selectGroupByField('machine.os.raw');
        await visualBuilder.setColumnLabelValue('OS');
        await visChart.waitForVisualizationRenderingStabilized();
      });

      it('should display correct values on changing group by field and column name', async () => {
        const EXPECTED = 'OS Count\nwin 8 13\nwin xp 10\nwin 7 12\nios 5\nosx 3';

        const tableData = await visualBuilder.getViewTable();
        expect(tableData).to.be(EXPECTED);
      });

      it('should display drilldown urls', async () => {
        const baseURL = 'http://elastic.co/foo/';

        await visualBuilder.clickPanelOptions('table');
        await visualBuilder.setDrilldownUrl(`${baseURL}{{key}}`);

        await retry.try(async () => {
          const links = await findService.allByCssSelector(`a[href="${baseURL}ios"]`);

          expect(links.length).to.be(1);
        });
      });

      it('should display correct values on changing metrics aggregation', async () => {
        const EXPECTED = 'OS Cardinality\nwin 8 12\nwin xp 9\nwin 7 8\nios 5\nosx 3';

        await visualBuilder.setLabel('Cardinality');
        await visualBuilder.selectAggType('Cardinality');
        await visualBuilder.setFieldForAggregation('machine.ram');
        const isFieldForAggregationValid = await visualBuilder.checkFieldForAggregationValidity();
        const tableData = await visualBuilder.getViewTable();
        expect(isFieldForAggregationValid).to.be(true);
        expect(tableData).to.be(EXPECTED);
      });

      it('should render correctly after saving', async () => {
        const EXPECTED = 'OS Count\nwin 8 13\nwin xp 10\nwin 7 12\nios 5\nosx 3';

        await visualize.saveVisualizationExpectSuccessAndBreadcrumb('TSVB table saving test');

        const tableData = await visualBuilder.getViewTable();
        expect(tableData).to.be(EXPECTED);
      });

      it('should display correct values for variance aggregation', async () => {
        const EXPECTED =
          'OS Variance of bytes\nwin 8 2,707,941.822\nwin xp 2,595,612.24\nwin 7 16,055,541.306\nios 6,505,206.56\nosx 1,016,620.667';
        await visualBuilder.selectAggType('Variance');
        await visualBuilder.setFieldForAggregation('bytes');
        await visualBuilder.clickSeriesOption();
        await visualBuilder.changeDataFormatter('number');

        const tableData = await visualBuilder.getViewTable();
        expect(tableData).to.be(EXPECTED);
      });

      it('should display correct values for filter ratio aggregation with numerator and denominator', async () => {
        const EXPECTED = 'OS Filter Ratio\nwin 8 2\nwin xp 0\nwin 7 3\nios 0\nosx 0';
        await visualBuilder.selectAggType('Filter Ratio');
        await visualBuilder.setFilterRatioOption('Numerator', 'extension.raw : "css"');
        await visualBuilder.setFilterRatioOption('Denominator', 'bytes <= 3000');
        await visChart.waitForVisualizationRenderingStabilized();

        const tableData = await visualBuilder.getViewTable();
        expect(tableData).to.be(EXPECTED);
      });

      it('should display correct values for average aggregation with last value time range mode', async () => {
        const EXPECTED =
          'OS Average of machine.ram\nwin 8 13,958,643,712\nwin xp 14,602,888,806.4\nwin 7 14,048,122,197.333\nios 11,166,914,969.6\nosx 20,401,094,656';
        await visualBuilder.selectAggType('Average');
        await visualBuilder.setFieldForAggregation('machine.ram');

        const tableData = await visualBuilder.getViewTable();
        expect(tableData).to.be(EXPECTED);
      });

      it('should display correct values for sum aggregation with entire time range mode', async () => {
        const EXPECTED =
          'OS Sum of memory\nwin 8 1,121,160\nwin xp 1,182,800\nwin 7 1,443,600\nios 971,360\nosx 858,480';
        await visualBuilder.selectAggType('Sum');
        await visualBuilder.setFieldForAggregation('memory');
        await visualBuilder.clickPanelOptions('table');
        await visualBuilder.setMetricsDataTimerangeMode('Entire time range');

        const tableData = await visualBuilder.getViewTable();
        expect(tableData).to.be(EXPECTED);
      });

      it('should display correct values for math aggregation', async () => {
        const EXPECTED = 'OS Math\nwin 8 2,937\nwin xp 460\nwin 7 2,997\nios 1,095\nosx 1,724';
        await visualBuilder.selectAggType('Min');
        await visualBuilder.setFieldForAggregation('bytes');
        await visualBuilder.createNewAgg();
        await visualBuilder.selectAggType('math', 1);
        await visualBuilder.fillInVariable('test', 'Min');
        await visualBuilder.fillInExpression('params.test + 1');

        const tableData = await visualBuilder.getViewTable();
        expect(tableData).to.be(EXPECTED);
      });

      describe('applying field formats from Advanced Settings', () => {
        const toggleSetFormatForMachineOsRaw = async () => {
          await settings.navigateTo();
          await settings.clickKibanaIndexPatterns();
          await settings.clickIndexPatternLogstash();
          await settings.openControlsByName('machine.os.raw');
          await settings.toggleRow('formatRow');
        };

        before(async () => {
          await toggleSetFormatForMachineOsRaw();
          await settings.setFieldFormat('string');
          await settings.setScriptedFieldStringTransform('upper');
          await settings.controlChangeSave();
        });

        beforeEach(async () => {
          await visualBuilder.selectAggType('Average');
          await visualBuilder.setFieldForAggregation('bytes');
        });

        it('should display field formatted row labels with field formatted data by default', async () => {
          const expected =
            'OS Average of bytes\nWIN 8 6.786KB\nWIN XP 3.804KB\nWIN 7 6.596KB\nIOS 4.844KB\nOSX 3.06KB';

          const tableData = await visualBuilder.getViewTable();
          expect(tableData).to.be(expected);
        });

        it('should display field formatted row labels with raw data', async () => {
          const expected =
            'OS Average of bytes\nWIN 8 6,948.846\nWIN XP 3,895.6\nWIN 7 6,753.833\nIOS 4,960.2\nOSX 3,133';

          await visualBuilder.clickSeriesOption();
          await visualBuilder.changeDataFormatter('number');

          const tableData = await visualBuilder.getViewTable();
          expect(tableData).to.be(expected);
        });

        it('should display field formatted row labels with TSVB formatted data', async () => {
          const expected =
            'OS Average of bytes\nWIN 8 694,884.615%\nWIN XP 389,560%\nWIN 7 675,383.333%\nIOS 496,020%\nOSX 313,300%';

          await visualBuilder.clickSeriesOption();
          await visualBuilder.changeDataFormatter('percent');

          const tableData = await visualBuilder.getViewTable();
          expect(tableData).to.be(expected);
        });

        after(async () => {
          await toggleSetFormatForMachineOsRaw();
          await settings.controlChangeSave();
        });
      });

      it('should display drilldown urls after field formatting is applied', async () => {
        const baseURL = 'http://elastic.co/foo/';

        await visualBuilder.clickPanelOptions('table');
        await visualBuilder.setDrilldownUrl(`${baseURL}{{key}}`);

        await retry.try(async () => {
          const links = await findService.allByCssSelector(`a[href="${baseURL}ios"]`);

          expect(links.length).to.be(1);
        });
      });
    });
  });
}
