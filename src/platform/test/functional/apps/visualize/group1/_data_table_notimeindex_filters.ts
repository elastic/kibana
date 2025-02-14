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
  const renderable = getService('renderable');
  const retry = getService('retry');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const { visualize, header, dashboard, timePicker, visEditor, visChart } = getPageObjects([
    'visualize',
    'header',
    'dashboard',
    'timePicker',
    'visEditor',
    'visChart',
  ]);

  describe('data table with index without time filter filters', function indexPatternCreation() {
    const vizName1 = 'Visualization DataTable w/o time filter';

    before(async function () {
      await visualize.initTests();
      log.debug('navigateToApp visualize');
      await visualize.navigateToNewAggBasedVisualization();
      log.debug('clickDataTable');
      await visualize.clickDataTable();
      log.debug('clickNewSearch');
      await visualize.clickNewSearch(visualize.index.LOGSTASH_NON_TIME_BASED);
      log.debug('Bucket = Split Rows');
      await visEditor.clickBucket('Split rows');
      log.debug('Aggregation = Histogram');
      await visEditor.selectAggregation('Histogram');
      log.debug('Field = bytes');
      await visEditor.selectField('bytes');
      log.debug('Interval = 2000');
      await visEditor.setInterval('2000', { type: 'numeric' });
      await visEditor.clickGo();
    });

    it('should be able to save and load', async function () {
      await visualize.saveVisualizationExpectSuccessAndBreadcrumb(vizName1);

      await visualize.loadSavedVisualization(vizName1);
      await visChart.waitForVisualization();
    });

    it('timefilter should be disabled', async () => {
      const isOff = await timePicker.isOff();
      expect(isOff).to.be(true);
    });

    // test to cover bug #54548 - add this visualization to a dashboard and filter
    it('should add to dashboard and allow filtering', async function () {
      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();
      await dashboardAddPanel.addVisualization(vizName1);

      await retry.try(async () => {
        // hover and click on cell to filter
        await visChart.filterOnTableCell(0, 1);

        await header.waitUntilLoadingHasFinished();
        await renderable.waitForRender();
        const filterCount = await filterBar.getFilterCount();
        expect(filterCount).to.be(1);
      });

      await filterBar.removeAllFilters();
    });
  });
}
