/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { PIE_CHART_VIS_NAME } from '../../../page_objects/dashboard_page';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const { dashboard, header, timePicker } = getPageObjects(['dashboard', 'header', 'timePicker']);

  describe('dashboard panel cloning', function viewEditModeTests() {
    before(async function () {
      await dashboard.initTests();
      await dashboard.preserveCrossAppState();
      await dashboard.clickNewDashboard();
      await timePicker.setHistoricalDataRange();
      await dashboardAddPanel.addVisualization(PIE_CHART_VIS_NAME);
    });

    after(async function () {
      await dashboard.gotoDashboardLandingPage();
    });

    it('clones a panel', async () => {
      const initialPanelTitles = await dashboard.getPanelTitles();
      await dashboardPanelActions.clonePanel(PIE_CHART_VIS_NAME);
      await header.waitUntilLoadingHasFinished();
      await dashboard.waitForRenderComplete();
      const postPanelTitles = await dashboard.getPanelTitles();
      expect(postPanelTitles.length).to.equal(initialPanelTitles.length + 1);
    });

    it('appends a clone title tag', async () => {
      const panelTitles = await dashboard.getPanelTitles();
      expect(panelTitles[1]).to.equal(`${PIE_CHART_VIS_NAME} (copy)`);
    });

    it('retains original panel dimensions', async () => {
      const panelDimensions = await dashboard.getPanelDimensions();
      expect(panelDimensions[0]).to.eql(panelDimensions[1]);
    });

    it('clone of a by reference embeddable is by value', async () => {
      await dashboardPanelActions.expectNotLinkedToLibrary(`${PIE_CHART_VIS_NAME} (copy)`);
    });

    it('gives a correct title to the clone of a clone', async () => {
      const initialPanelTitles = await dashboard.getPanelTitles();
      const clonedPanelName = initialPanelTitles[initialPanelTitles.length - 1];
      await dashboardPanelActions.clonePanel(clonedPanelName);
      await header.waitUntilLoadingHasFinished();
      await dashboard.waitForRenderComplete();
      const postPanelTitles = await dashboard.getPanelTitles();
      expect(postPanelTitles.length).to.equal(initialPanelTitles.length + 1);
      expect(postPanelTitles[postPanelTitles.length - 1]).to.equal(
        `${PIE_CHART_VIS_NAME} (copy 1)`
      );
    });

    it('clone of a by value embeddable is by value', async () => {
      await dashboardPanelActions.expectNotLinkedToLibrary(`${PIE_CHART_VIS_NAME} (copy)`);
    });
  });
}
