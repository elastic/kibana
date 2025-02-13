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
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const { dashboard, timePicker, header } = getPageObjects(['dashboard', 'timePicker', 'header']);
  const testSubjects = getService('testSubjects');
  const monacoEditor = getService('monacoEditor');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const log = getService('log');

  describe('dashboard add ES|QL chart', function () {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
    });

    after(async () => {
      await dashboard.navigateToApp();
      await testSubjects.click('discard-unsaved-New-Dashboard');
    });

    it('should add an ES|QL datatable chart when the ES|QL panel action is clicked', async () => {
      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();
      await timePicker.setDefaultDataRange();
      await dashboard.switchToEditMode();
      await dashboardAddPanel.clickEditorMenuButton();
      await dashboardAddPanel.clickAddNewPanelFromUIActionLink('ES|QL');
      await dashboardAddPanel.expectEditorMenuClosed();
      await dashboard.waitForRenderComplete();

      await retry.try(async () => {
        const panelCount = await dashboard.getPanelCount();
        expect(panelCount).to.eql(1);
      });

      expect(await testSubjects.exists('lnsDataTable')).to.be(true);
    });

    it('should remove the panel if cancel button is clicked', async () => {
      await testSubjects.click('cancelFlyoutButton');
      await dashboard.waitForRenderComplete();
      await retry.try(async () => {
        const panelCount = await dashboard.getPanelCount();
        expect(panelCount).to.eql(0);
      });
    });

    it('should reset to the previous state on edit inline', async () => {
      await dashboardAddPanel.clickEditorMenuButton();
      await dashboardAddPanel.clickAddNewPanelFromUIActionLink('ES|QL');
      await dashboardAddPanel.expectEditorMenuClosed();
      await dashboard.waitForRenderComplete();

      // Save the panel and close the flyout
      log.debug('Applies the changes');
      await testSubjects.click('applyFlyoutButton');

      // now edit the panel and click on Cancel
      await dashboardPanelActions.clickInlineEdit();

      const metricsConfigured = await testSubjects.findAll(
        'lnsDatatable_metrics > lnsLayerPanel-dimensionLink'
      );
      // remove the first metric from the configuration
      // Lens is x-pack so not available here, make things manually
      await testSubjects.moveMouseTo(`lnsDatatable_metrics > indexPattern-dimension-remove`);
      await testSubjects.click(`lnsDatatable_metrics > indexPattern-dimension-remove`);
      const beforeCancelMetricsConfigured = await testSubjects.findAll(
        'lnsDatatable_metrics > lnsLayerPanel-dimensionLink'
      );
      expect(beforeCancelMetricsConfigured.length).to.eql(metricsConfigured.length - 1);

      // now click cancel
      await testSubjects.click('cancelFlyoutButton');
      await dashboard.waitForRenderComplete();

      // re open the inline editor and check that the configured metrics are still the original ones
      await dashboardPanelActions.clickInlineEdit();
      const afterCancelMetricsConfigured = await testSubjects.findAll(
        'lnsDatatable_metrics > lnsLayerPanel-dimensionLink'
      );
      expect(afterCancelMetricsConfigured.length).to.eql(metricsConfigured.length);
      // delete the panel
      await testSubjects.click('cancelFlyoutButton');
      const panels = await dashboard.getDashboardPanels();
      await dashboardPanelActions.removePanel(panels[0]);
    });

    it('should be able to edit the query and render another chart', async () => {
      await dashboardAddPanel.clickEditorMenuButton();
      await dashboardAddPanel.clickAddNewPanelFromUIActionLink('ES|QL');
      await dashboardAddPanel.expectEditorMenuClosed();
      await dashboard.waitForRenderComplete();

      await monacoEditor.setCodeEditorValue('from logstash-* | stats maxB = max(bytes)');
      await testSubjects.click('ESQLEditor-run-query-button');
      await header.waitUntilLoadingHasFinished();

      await testSubjects.click('applyFlyoutButton');
      expect(await testSubjects.exists('mtrVis')).to.be(true);
    });

    it('should add a second panel and remove when hitting cancel', async () => {
      await dashboardAddPanel.clickEditorMenuButton();
      await dashboardAddPanel.clickAddNewPanelFromUIActionLink('ES|QL');
      await dashboardAddPanel.expectEditorMenuClosed();
      await dashboard.waitForRenderComplete();
      // Cancel
      await testSubjects.click('cancelFlyoutButton');
      // Test that there's only 1 panel left
      await dashboard.waitForRenderComplete();
      await retry.try(async () => {
        const panelCount = await dashboard.getPanelCount();
        expect(panelCount).to.eql(1);
      });
    });

    it('should not remove the first panel of two when editing and cancelling', async () => {
      // add a second panel
      await dashboardAddPanel.clickEditorMenuButton();
      await dashboardAddPanel.clickAddNewPanelFromUIActionLink('ES|QL');
      await dashboardAddPanel.expectEditorMenuClosed();
      await dashboard.waitForRenderComplete();
      // save it
      await testSubjects.click('applyFlyoutButton');
      await dashboard.waitForRenderComplete();

      // now edit the first one
      const [firstPanel] = await dashboard.getDashboardPanels();
      await dashboardPanelActions.clickInlineEdit(firstPanel);
      await testSubjects.click('cancelFlyoutButton');
      await dashboard.waitForRenderComplete();
      await retry.try(async () => {
        const panelCount = await dashboard.getPanelCount();
        expect(panelCount).to.eql(2);
      });
    });
  });
}
