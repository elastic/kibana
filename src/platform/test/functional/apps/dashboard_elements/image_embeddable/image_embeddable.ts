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
  const { common, dashboard, header } = getPageObjects(['common', 'dashboard', 'header']);
  const testSubjects = getService('testSubjects');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');

  const dashboardDrilldownPanelActions = getService('dashboardDrilldownPanelActions');
  const dashboardDrilldownsManage = getService('dashboardDrilldownsManage');

  describe('image embeddable', function () {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });

      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();
      await dashboard.switchToEditMode();
    });

    it('should create an image embeddable', async () => {
      // create an image embeddable
      await dashboardAddPanel.clickEditorMenuButton();
      await dashboardAddPanel.clickAddNewPanelFromUIActionLink('Image');
      await testSubjects.exists(`createImageEmbeddableFlyout`);
      await common.setFileInputPath(require.resolve('./elastic_logo.png'));
      await testSubjects.clickWhenNotDisabled(`imageEmbeddableEditorSave`);

      // check that it is added on the dashboard
      expect(await dashboard.getSharedItemsCount()).to.be('1');
      await dashboard.waitForRenderComplete();
      const panel = (await dashboard.getDashboardPanels())[0];
      const img = await panel.findByCssSelector('img.euiImage');
      const imgSrc = await img.getAttribute('src');
      expect(imgSrc).to.contain(`files/defaultImage`);
    });

    it('image embeddable should support drilldowns', async () => {
      await dashboardDrilldownPanelActions.expectExistsCreateDrilldownAction();
      await dashboardDrilldownPanelActions.clickCreateDrilldown();
      await dashboardDrilldownsManage.expectsCreateDrilldownFlyoutOpen();

      await testSubjects.click('actionFactoryItem-DASHBOARD_TO_DASHBOARD_DRILLDOWN');
      await dashboardDrilldownsManage.fillInDashboardToDashboardDrilldownWizard({
        drilldownName: `My drilldown`,
        destinationDashboardTitle: `few panels`,
      });

      await dashboardDrilldownsManage.saveChanges();
      await dashboardDrilldownsManage.closeFlyout();

      expect(await dashboardDrilldownPanelActions.getPanelDrilldownCount()).to.be(1);

      const panel = (await dashboard.getDashboardPanels())[0];
      const img = await panel.findByCssSelector('img.euiImage');

      const oldDashboardId = await dashboard.getDashboardIdFromCurrentUrl();

      await img.click();

      await retry.waitFor('navigate to different dashboard', async () => {
        const newDashboardId = await dashboard.getDashboardIdFromCurrentUrl();
        return typeof newDashboardId === 'string' && oldDashboardId !== newDashboardId;
      });
      await header.waitUntilLoadingHasFinished();
      await dashboard.waitForRenderComplete();
    });
  });
}
