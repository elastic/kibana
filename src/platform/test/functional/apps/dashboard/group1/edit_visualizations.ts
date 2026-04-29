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

const getTestSpec = (text = 'Test') => `
{
config: { "kibana": {"renderer": "svg"} }
$schema: https://vega.github.io/schema/vega/v5.json
marks: [{
  type: text
  encode: { update: { text: { value: "${text}" } } }
}]}`;

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { dashboard, header, visualize, visEditor, vegaChart, visChart, timePicker } =
    getPageObjects([
      'dashboard',
      'header',
      'visualize',
      'visEditor',
      'vegaChart',
      'visChart',
      'timePicker',
    ]);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');

  const fillSpecAndGo = async (newSpec: string) => {
    await vegaChart.fillSpec(newSpec);
    await visEditor.clickGo();
  };

  const expectVegaText = async (text: string) => {
    const vegaText = await (await vegaChart.getViewContainer()).findByTagName('text');
    expect(await vegaText.getVisibleText()).to.eql(text);
  };

  const createVegaVis = async (title?: string) => {
    await dashboardAddPanel.clickAddCustomVisualization();
    await fillSpecAndGo(getTestSpec());

    await visChart.waitForVisualizationRenderingStabilized();
    if (title) {
      await visualize.saveVisualizationExpectSuccess(title, {
        saveAsNew: true,
        redirectToOrigin: true,
      });
      await dashboard.waitForRenderComplete();
    } else {
      await visualize.saveVisualizationAndReturn();
    }
  };

  const editVegaVis = async () => {
    await dashboardPanelActions.clickEdit();
    await header.waitUntilLoadingHasFinished();
    await fillSpecAndGo(getTestSpec('Modified'));
    await visChart.waitForVisualizationRenderingStabilized();
  };

  describe('edit visualizations from dashboard', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await dashboard.navigateToApp();
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('save button returns to dashboard after editing visualization with changes saved', async () => {
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();

      await createVegaVis('test save');
      await expectVegaText('Test');
      await editVegaVis();
      await visualize.saveVisualizationAndReturn();
      expect(await (await vegaChart.getViewContainer()).getVisibleText()).to.eql('Modified');
    });

    it('cancel button returns to dashboard with no modal if there are no changes to apply', async () => {
      await dashboardPanelActions.clickEdit();
      await header.waitUntilLoadingHasFinished();

      await visualize.cancelAndReturn(false);
      await expectVegaText('Modified');
    });

    it('cancel button returns to dashboard after editing visualization without saving', async () => {
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();

      await createVegaVis('test cancel');

      await editVegaVis();
      await visualize.cancelAndReturn(true);
      await expectVegaText('Test');
    });

    it('visualize app menu navigates to the visualize listing page if the last opened visualization was by value', async () => {
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();
      await createVegaVis();
      await editVegaVis();
      await visualize.saveVisualizationAndReturn();

      await header.waitUntilLoadingHasFinished();
      await appsMenu.clickLink('Visualize library');
      expect(await testSubjects.exists('visualizationLandingPage')).to.be(true);
    });

    it('visualize app menu navigates to the visualize listing page if the last opened visualization was linked to dashboard', async () => {
      await dashboard.navigateToApp();
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();
      await createVegaVis('by reference');
      await editVegaVis();
      await visualize.saveVisualizationAndReturn();

      await header.waitUntilLoadingHasFinished();
      await appsMenu.clickLink('Visualize library');
      expect(await testSubjects.exists('visualizationLandingPage')).to.be(true);
    });

    describe('by value', () => {
      it('save and return button returns to dashboard after editing visualization with changes saved', async () => {
        await dashboard.navigateToApp();
        await dashboard.clickNewDashboard();

        await createVegaVis();
        const originalPanelCount = await dashboard.getPanelCount();
        await editVegaVis();
        await visualize.saveVisualizationAndReturn();
        await expectVegaText('Modified');

        const newPanelCount = await dashboard.getPanelCount();
        expect(newPanelCount).to.eql(originalPanelCount);
      });

      it('cancel button returns to dashboard after editing visualization without saving', async () => {
        await dashboard.gotoDashboardLandingPage();
        await dashboard.clickNewDashboard();

        await createVegaVis();

        await editVegaVis();
        await visualize.cancelAndReturn(true);
        await expectVegaText('Test');
      });

      it('save to library button returns to dashboard after editing visualization with changes saved', async () => {
        await dashboard.gotoDashboardLandingPage();
        await dashboard.clickNewDashboard();

        await createVegaVis();

        const originalPanelCount = await dashboard.getPanelCount();

        await editVegaVis();
        await visualize.saveVisualization('test save to library', {
          redirectToOrigin: true,
        });

        await expectVegaText('Modified');

        const newPanelCount = await dashboard.getPanelCount();
        expect(newPanelCount).to.eql(originalPanelCount);
      });

      it('should lose its connection to the dashboard when creating new visualization', async () => {
        await visualize.gotoVisualizationLandingPage();
        await visualize.clickNewVisualization();
        await visualize.clickVisualBuilder();
        await visualize.notLinkedToOriginatingApp();

        // return to origin should not be present in save modal
        await testSubjects.click('visualizeSaveButton');
        const redirectToOriginCheckboxExists = await testSubjects.exists(
          'returnToOriginModeSwitch'
        );
        expect(redirectToOriginCheckboxExists).to.be(false);
      });
    });
  });
}
