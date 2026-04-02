/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const esql = getService('esql');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  const { dashboard, dashboardControls, discover, common, timePicker } = getPageObjects([
    'dashboard',
    'dashboardControls',
    'discover',
    'common',
    'timePicker',
  ]);

  describe('discover esql controls', () => {
    before(async () => {
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
        enableESQL: true,
      });

      await kibanaServer.savedObjects.cleanStandardList();
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/esql_controls'
      );
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
    });

    describe('when adding an ES|QL panel with controls in dashboards and exploring it in discover', () => {
      it('should retain the controls and their state', async () => {
        // Navigate to a dasbhoard with an ESQL control
        await dashboard.navigateToApp();
        await dashboard.loadSavedDashboard('ES|QL controls fixture dashboard');
        await dashboard.waitForRenderComplete();

        const controlGroupVisible = await testSubjects.exists('controls-group-wrapper');
        expect(controlGroupVisible).to.be(true);

        // Go to discover from the embeddable
        await dashboardPanelActions.clickPanelAction(
          'embeddablePanelAction-ACTION_OPEN_IN_DISCOVER'
        );

        // Verify that we are in discover
        const [, discoverHandle] = await browser.getAllWindowHandles();
        await browser.switchToWindow(discoverHandle);

        await discover.expectOnDiscover();

        // Verify that the control exists in discover
        const control = await dashboardControls.getControlElementById('esql-control-1');
        expect(control).to.be.ok();
        await discover.expectDocTableToBeLoaded();
      });
    });

    describe('when unlinking a ES|QL panel with controls and explorting it in discover', () => {
      it('should retain the controls and their state', async () => {
        // Go to discover
        await common.navigateToApp('discover');
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();

        // Create a search with controls
        await timePicker.setDefaultAbsoluteRange();
        await esql.createEsqlControl('FROM logstash-* | WHERE geo.dest == ');
        await discover.waitUntilTabIsLoaded();

        // Save session
        await discover.saveSearch('ESQL control unlink test');

        // Go to dashboards
        await dashboard.navigateToApp();
        await dashboard.clickNewDashboard();

        // Add the saved search
        await dashboardAddPanel.addSavedSearch('ESQL control unlink test');

        // Unlink the saved search
        await dashboardPanelActions.clickPanelActionByTitle(
          'embeddablePanelAction-unlinkFromLibrary',
          'ESQL control unlink test'
        );

        // Save dashboard and go to view mode
        await dashboard.saveDashboard('ESQL control unlink test dashboard');
        await dashboard.switchToViewMode();

        // Go to discover from the panel
        await dashboardPanelActions.clickPanelActionByTitle(
          'embeddablePanelAction-ACTION_VIEW_SAVED_SEARCH',
          'ESQL control unlink test'
        );

        // Verify that we are in discover and the control exists
        await discover.expectOnDiscover();
        expect(await dashboardControls.getControlsCount()).to.be(1);
      });
    });
  });
}
