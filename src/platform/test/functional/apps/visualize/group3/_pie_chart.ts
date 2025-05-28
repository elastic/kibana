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
  const filterBar = getService('filterBar');
  const pieChart = getService('pieChart');
  const inspector = getService('inspector');

  const { common, visualize, visEditor, visChart, header, timePicker } = getPageObjects([
    'common',
    'visualize',
    'visEditor',
    'visChart',
    'header',
    'timePicker',
  ]);

  describe('pie chart', function () {
    // Used to track flag before and after reset
    const vizName1 = 'Visualization PieChart';
    before(async function () {
      await visualize.initTests();

      log.debug('navigateToApp visualize');
      await visualize.navigateToNewAggBasedVisualization();
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
      log.debug('clickPieChart');
      await visualize.clickPieChart();
      await visualize.clickNewSearch();
      log.debug('select bucket Split slices');
      await visEditor.clickBucket('Split slices');
      log.debug('Click aggregation Histogram');
      await visEditor.selectAggregation('Histogram');
      log.debug('Click field memory');
      await visEditor.selectField('memory');
      await header.waitUntilLoadingHasFinished();
      await common.sleep(1003);
      log.debug('setNumericInterval 4000');
      await visEditor.setInterval('40000', { type: 'numeric' });
      log.debug('clickGo');
      await visEditor.clickGo();
    });

    after(async () => {
      await common.unsetTime();
    });

    it('should save and load', async function () {
      await visualize.saveVisualizationExpectSuccessAndBreadcrumb(vizName1);

      await visualize.loadSavedVisualization(vizName1);
      await visChart.waitForVisualization();
    });

    it('should have inspector enabled', async function () {
      await inspector.expectIsEnabled();
    });

    it('should show 10 slices in pie chart', async function () {
      await pieChart.expectPieSliceCount(10);
    });

    it('should show correct data', async function () {
      const expectedTableData = [
        ['0', '55'],
        ['40,000', '50'],
        ['80,000', '41'],
        ['120,000', '43'],
        ['160,000', '44'],
        ['200,000', '40'],
        ['240,000', '46'],
        ['280,000', '39'],
        ['320,000', '40'],
        ['360,000', '47'],
      ];

      await inspector.open();
      await inspector.setTablePageSize(50);
      await inspector.expectTableData(expectedTableData);
    });

    describe('other bucket', () => {
      it('should show other and missing bucket', async function () {
        const expectedTableData = ['Missing', 'Other', 'ios', 'win 7', 'win 8', 'win xp'];

        await visualize.navigateToNewAggBasedVisualization();
        log.debug('clickPieChart');
        await visualize.clickPieChart();
        await visualize.clickNewSearch();
        log.debug('select bucket Split slices');
        await visEditor.clickBucket('Split slices');
        log.debug('Click aggregation Terms');
        await visEditor.selectAggregation('Terms');
        log.debug('Click field machine.os.raw');
        await visEditor.selectField('machine.os.raw');
        await visEditor.toggleOtherBucket(2);
        await visEditor.toggleMissingBucket(2);
        log.debug('clickGo');
        await visEditor.clickGo();
        await pieChart.expectPieChartLabels(expectedTableData);
      });

      it('should apply correct filter on other bucket', async () => {
        const expectedTableData = ['Missing', 'osx'];

        await pieChart.filterOnPieSlice('Other');
        await visChart.waitForVisualization();
        await pieChart.expectPieChartLabels(expectedTableData);
        await filterBar.removeFilter('machine.os.raw');
        await visChart.waitForVisualization();
      });

      it('should apply correct filter on other bucket by clicking on a legend', async () => {
        const expectedTableData = ['Missing', 'osx'];

        await visChart.filterLegend('Other');
        await visChart.waitForVisualization();
        await pieChart.expectPieChartLabels(expectedTableData);
        await filterBar.removeFilter('machine.os.raw');
        await visChart.waitForVisualization();
      });

      it('should show two levels of other buckets', async () => {
        const expectedTableData = [
          'win 8',
          'CN',
          'IN',
          'US',
          'ID',
          'BR',
          'Other',
          'win xp',
          'CN',
          'IN',
          'US',
          'ID',
          'BR',
          'Other',
          'win 7',
          'CN',
          'IN',
          'US',
          'ID',
          'BR',
          'Other',
          'ios',
          'IN',
          'CN',
          'US',
          'ID',
          'BR',
          'Other',
          'Missing',
          'CN',
          'IN',
          'US',
          'BR',
          'PK',
          'Other',
          'Other',
          'IN',
          'CN',
          'US',
          'ID',
          'BR',
          'Other',
        ].sort();

        await visEditor.toggleOpenEditor(2, 'false');
        await visEditor.clickBucket('Split slices');
        await visEditor.selectAggregation('Terms');
        log.debug('Click field geo.src');
        await visEditor.selectField('geo.src');
        await visEditor.toggleOtherBucket(3);
        await visEditor.toggleMissingBucket(3);
        log.debug('clickGo');
        await visEditor.clickGo();
        await pieChart.expectPieChartLabels(expectedTableData);
      });
    });

    describe('disabled aggs', () => {
      before(async () => {
        await visualize.loadSavedVisualization(vizName1);
        await visChart.waitForRenderingCount();
      });

      it('should show correct result with one agg disabled', async () => {
        const expectedTableData = ['ios', 'osx', 'win 7', 'win 8', 'win xp'];

        await visEditor.clickBucket('Split slices');
        await visEditor.selectAggregation('Terms');
        await visEditor.selectField('machine.os.raw');
        await visEditor.toggleDisabledAgg(2);
        await visEditor.clickGo();

        await pieChart.expectPieChartLabels(expectedTableData);
      });

      it('should correctly save disabled agg', async () => {
        await visualize.saveVisualizationExpectSuccessAndBreadcrumb(vizName1);

        await visualize.loadSavedVisualization(vizName1);
        await visChart.waitForRenderingCount();

        const expectedTableData = ['ios', 'osx', 'win 7', 'win 8', 'win xp'];
        await pieChart.expectPieChartLabels(expectedTableData);
      });

      it('should show correct result when agg is re-enabled', async () => {
        await visEditor.toggleDisabledAgg(2);
        await visEditor.clickGo();

        const expectedTableData = [
          '0',
          'win 7',
          'win xp',
          'win 8',
          'ios',
          'osx',
          '40,000',
          'win 8',
          'ios',
          'win 7',
          'win xp',
          'osx',
          '80,000',
          'win 7',
          'win 8',
          'osx',
          'win xp',
          'ios',
          '120,000',
          'ios',
          'win xp',
          'win 7',
          'win 8',
          'osx',
          '160,000',
          'win 8',
          'ios',
          'win 7',
          'win xp',
          'osx',
          '200,000',
          'win 8',
          'ios',
          'win xp',
          'win 7',
          'osx',
          '240,000',
          'ios',
          'win 7',
          'win xp',
          'win 8',
          'osx',
          '280,000',
          'win xp',
          'win 8',
          'win 7',
          'ios',
          'osx',
          '320,000',
          'win xp',
          'win 7',
          'ios',
          'win 8',
          'osx',
          '360,000',
          'win 7',
          'win xp',
          'ios',
          'win 8',
          'osx',
        ].sort();

        await pieChart.expectPieChartLabels(expectedTableData);
      });
    });

    describe('empty time window', () => {
      it('should show no data message when no data on selected timerange', async function () {
        await visualize.navigateToNewAggBasedVisualization();
        log.debug('clickPieChart');
        await visualize.clickPieChart();
        await visualize.clickNewSearch();
        log.debug('select bucket Split slices');
        await visEditor.clickBucket('Split slices');
        log.debug('Click aggregation Filters');
        await visEditor.selectAggregation('Filters');
        log.debug('Set the 1st filter value');
        await visEditor.setFilterAggregationValue('geo.dest:"US"');
        log.debug('Add new filter');
        await visEditor.addNewFilterAggregation();
        log.debug('Set the 2nd filter value');
        await visEditor.setFilterAggregationValue('geo.dest:"CN"', 1);
        await visEditor.clickGo();
        const emptyFromTime = 'Sep 19, 2016 @ 06:31:44.000';
        const emptyToTime = 'Sep 23, 2016 @ 18:31:44.000';
        log.debug(
          'Switch to a different time range from "' + emptyFromTime + '" to "' + emptyToTime + '"'
        );
        await timePicker.setAbsoluteRange(emptyFromTime, emptyToTime);
        await visChart.waitForVisualization();
      });
    });
    describe('multi series slice', () => {
      before(async () => {
        log.debug('navigateToApp visualize');
        await visualize.navigateToNewAggBasedVisualization();
        log.debug('clickPieChart');
        await visualize.clickPieChart();
        await visualize.clickNewSearch();
        log.debug('select bucket Split slices');
        await visEditor.clickBucket('Split slices');
        log.debug('Click aggregation Histogram');
        await visEditor.selectAggregation('Histogram');
        log.debug('Click field memory');
        await visEditor.selectField('memory');
        await header.waitUntilLoadingHasFinished();
        await common.sleep(1003);
        log.debug('setNumericInterval 4000');
        await visEditor.setInterval('40000', { type: 'numeric' });
        log.debug('Toggle previous editor');
        await visEditor.toggleAggregationEditor(2);
        log.debug('select bucket Split slices');
        await visEditor.clickBucket('Split slices');
        await visEditor.selectAggregation('Terms');
        await visEditor.selectField('geo.dest');
        await visEditor.clickGo();
      });

      it('should show correct chart', async () => {
        const expectedTableData = [
          ['0', '55', 'CN', '14'],
          ['0', '55', 'IN', '9'],
          ['0', '55', 'MX', '3'],
          ['0', '55', 'US', '3'],
          ['0', '55', 'BR', '2'],
          ['40,000', '50', 'CN', '7'],
          ['40,000', '50', 'IN', '7'],
          ['40,000', '50', 'US', '5'],
          ['40,000', '50', 'MY', '3'],
          ['40,000', '50', 'ET', '2'],
          ['80,000', '41', 'CN', '9'],
          ['80,000', '41', 'IN', '4'],
          ['80,000', '41', 'US', '4'],
          ['80,000', '41', 'BR', '3'],
          ['80,000', '41', 'IT', '2'],
          ['120,000', '43', 'CN', '8'],
          ['120,000', '43', 'IN', '5'],
          ['120,000', '43', 'US', '4'],
          ['120,000', '43', 'JP', '3'],
          ['120,000', '43', 'RU', '3'],
          ['160,000', '44', 'CN', '15'],
          ['160,000', '44', 'IN', '5'],
          ['160,000', '44', 'IQ', '2'],
          ['160,000', '44', 'JP', '2'],
          ['160,000', '44', 'NG', '2'],
          ['200,000', '40', 'IN', '7'],
          ['200,000', '40', 'CN', '6'],
          ['200,000', '40', 'MX', '3'],
          ['200,000', '40', 'BR', '2'],
          ['200,000', '40', 'ID', '2'],
          ['240,000', '46', 'CN', '6'],
          ['240,000', '46', 'IN', '6'],
          ['240,000', '46', 'US', '6'],
          ['240,000', '46', 'NG', '3'],
          ['240,000', '46', 'CH', '2'],
          ['280,000', '39', 'CN', '11'],
          ['280,000', '39', 'IN', '5'],
          ['280,000', '39', 'BR', '2'],
          ['280,000', '39', 'IT', '2'],
          ['280,000', '39', 'NG', '2'],
          ['320,000', '40', 'CN', '7'],
          ['320,000', '40', 'US', '6'],
          ['320,000', '40', 'MX', '4'],
          ['320,000', '40', 'BD', '2'],
          ['320,000', '40', 'ID', '2'],
          ['360,000', '47', 'IN', '8'],
          ['360,000', '47', 'CN', '6'],
          ['360,000', '47', 'US', '4'],
          ['360,000', '47', 'BD', '3'],
          ['360,000', '47', 'BR', '2'],
        ].map((row) =>
          // the count of records is not shown for every split level in the new charting library
          [row[0], ...row.slice(2)]
        );

        await inspector.open();
        await inspector.setTablePageSize(50);
        await inspector.expectTableData(expectedTableData);
        await inspector.close();
      });

      it('should correctly filter on legend', async () => {
        const expectedTableData = [
          '0',
          'CN',
          '40,000',
          'CN',
          '80,000',
          'CN',
          '120,000',
          'CN',
          '160,000',
          'CN',
          '200,000',
          'CN',
          '240,000',
          'CN',
          '280,000',
          'CN',
          '320,000',
          'CN',
          '360,000',
          'CN',
        ].sort();

        await visEditor.clickOptionsTab();
        await visEditor.togglePieLegend();
        await visEditor.togglePieNestedLegend();
        await visEditor.clickDataTab();
        await visEditor.clickGo();

        await visChart.filterLegend('CN');
        await visChart.waitForVisualization();
        await pieChart.expectPieChartLabels(expectedTableData);
        await filterBar.removeFilter('geo.dest');
        await visChart.waitForVisualization();
      });

      // TODO: it seems that adding a filter agg which has no results to a pie chart breaks it and instead it shows "no data"
      it.skip('should still showing pie chart when a subseries have zero data', async function () {
        await visualize.navigateToNewAggBasedVisualization();
        log.debug('clickPieChart');
        await visualize.clickPieChart();
        await visualize.clickNewSearch();
        log.debug('select bucket Split slices');
        await visEditor.clickBucket('Split slices');
        log.debug('Click aggregation Filters');
        await visEditor.selectAggregation('Filters');
        log.debug('Set the 1st filter value');
        await visEditor.setFilterAggregationValue('geo.dest:"US"');
        log.debug('Toggle previous editor');
        await visEditor.toggleAggregationEditor(2);
        log.debug('Add a new series, select bucket Split slices');
        await visEditor.clickBucket('Split slices');
        log.debug('Click aggregation Filters');
        await visEditor.selectAggregation('Filters');
        log.debug('Set the 1st filter value of the aggregation id 3');
        await visEditor.setFilterAggregationValue('geo.dest:"UX"', 0, 3);
        await visEditor.clickGo();
        const legends = await visChart.getLegendEntries();
        const expectedLegends = ['geo.dest:"US"', 'geo.dest:"UX"'];
        expect(legends).to.eql(expectedLegends);
      });
    });

    describe('split chart', () => {
      before(async () => {
        await visualize.navigateToNewAggBasedVisualization();
        await visualize.clickPieChart();
        await visualize.clickNewSearch();
        log.debug('select bucket Split chart');
        await visEditor.clickBucket('Split chart');
        await visEditor.selectAggregation('Terms');
        await visEditor.selectField('machine.os.raw');
        await visEditor.toggleAggregationEditor(2);
        log.debug('Add a new series, select bucket Split slices');
        await visEditor.clickBucket('Split slices');
        await visEditor.selectAggregation('Terms');
        await visEditor.selectField('geo.src');
        await visEditor.clickGo();
      });

      it('shows correct split chart', async () => {
        const expectedTableData = [
          ['win 8', '2,904', 'CN', '560'],
          ['win 8', '2,904', 'IN', '489'],
          ['win 8', '2,904', 'US', '223'],
          ['win 8', '2,904', 'ID', '100'],
          ['win 8', '2,904', 'BR', '89'],
          ['win xp', '2,858', 'CN', '526'],
          ['win xp', '2,858', 'IN', '467'],
          ['win xp', '2,858', 'US', '250'],
          ['win xp', '2,858', 'ID', '98'],
          ['win xp', '2,858', 'BR', '84'],
          ['win 7', '2,814', 'CN', '537'],
          ['win 7', '2,814', 'IN', '460'],
          ['win 7', '2,814', 'US', '260'],
          ['win 7', '2,814', 'ID', '102'],
          ['win 7', '2,814', 'BR', '74'],
          ['ios', '2,784', 'IN', '494'],
          ['ios', '2,784', 'CN', '478'],
          ['ios', '2,784', 'US', '222'],
          ['ios', '2,784', 'ID', '96'],
          ['ios', '2,784', 'BR', '84'],
          ['osx', '1,322', 'IN', '242'],
          ['osx', '1,322', 'CN', '228'],
          ['osx', '1,322', 'US', '130'],
          ['osx', '1,322', 'ID', '56'],
          ['osx', '1,322', 'BR', '30'],
        ].map((row) =>
          // the count of records is not shown for every split level in the new charting library
          [row[0], ...row.slice(2)]
        );
        await inspector.open();
        await inspector.setTablePageSize(50);
        await inspector.expectTableData(expectedTableData);
        await inspector.close();
      });

      it('correctly applies filter', async () => {
        const expectedTableData = [
          ['win 8', '560', 'CN', '560'],
          ['win 7', '537', 'CN', '537'],
          ['win xp', '526', 'CN', '526'],
          ['ios', '478', 'CN', '478'],
          ['osx', '228', 'CN', '228'],
        ].map((row) =>
          // the count of records is not shown for every split level in the new charting library
          [row[0], ...row.slice(2)]
        );
        await visChart.filterLegend('CN');
        await header.waitUntilLoadingHasFinished();
        await inspector.open();
        await inspector.setTablePageSize(50);
        await inspector.expectTableData(expectedTableData);
        await inspector.close();
      });
    });
  });
}
