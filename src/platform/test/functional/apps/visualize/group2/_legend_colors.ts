/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import expect from '@kbn/expect';
import { AREA_CHART_VIS_NAME } from '../../../page_objects/dashboard_page';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { dashboard, visChart, timePicker } = getPageObjects([
    'dashboard',
    'visChart',
    'timePicker',
  ]);
  const browser = getService('browser');
  const queryBar = getService('queryBar');
  const elasticChart = getService('elasticChart');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const xyChartSelector = 'xyVisChart';

  const enableNewChartLibraryDebug = async (force = false) => {
    if ((await visChart.isNewChartsLibraryEnabled()) || force) {
      await elasticChart.setNewChartUiDebugFlag();
      await queryBar.submitQuery();
    }
  };

  describe('legend colors', function () {
    before(async function () {
      await dashboard.initTests();
      await dashboard.preserveCrossAppState();

      await browser.refresh();
    });

    after(async function () {
      await dashboard.gotoDashboardLandingPage();
    });

    it('Overriding colors on an area chart is preserved', async () => {
      await dashboard.gotoDashboardLandingPage();

      await dashboard.clickNewDashboard();
      await timePicker.setHistoricalDataRange();

      const visName = AREA_CHART_VIS_NAME;
      await dashboardAddPanel.addVisualization(visName);
      const dashboardName = 'Overridden colors - new charts library';
      await dashboard.saveDashboard(dashboardName);

      await dashboard.switchToEditMode();
      await queryBar.clickQuerySubmitButton();

      await visChart.openLegendOptionColorsForXY('Count', `[data-title="${visName}"]`);
      const overwriteColor = '#64d8d5';
      await visChart.selectNewLegendColorChoice(overwriteColor);

      await dashboard.saveDashboard(dashboardName, { saveAsNew: false });

      await dashboard.loadSavedDashboard(dashboardName);

      await enableNewChartLibraryDebug(true);

      const colorChoiceRetained = await visChart.doesSelectedLegendColorExistForXY(
        overwriteColor,
        xyChartSelector
      );

      expect(colorChoiceRetained).to.be(true);
    });
  });
}
