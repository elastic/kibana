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
  const find = getService('find');
  const esql = getService('esql');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
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
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
    });

    describe('when adding an ES|QL panel with controls in dashboards and exploring it in discover', () => {
      it('should retain the controls and their state', async () => {
        // Go to dashboard app
        await dashboard.navigateToApp();

        // Create new dashboard
        await dashboard.clickNewDashboard();

        // Add a variable control
        await dashboardControls.openControlsMenu();
        await find.clickByButtonText('Variable control');
        await esql.waitESQLEditorLoaded('ESQLEditor');
        await esql.setEsqlEditorQuery('FROM logstash-* | STATS BY geo.dest');

        await find.clickByButtonText('Run query');
        expect(await testSubjects.exists('esqlValuesPreview')).to.be(true);
        await testSubjects.click('saveEsqlControlsFlyoutButton');

        const createdControlId = (await dashboardControls.getAllControlIds())[0];

        // Add a new ES|QL panel
        await dashboardAddPanel.clickAddEsqlPanel();
        await esql.waitESQLEditorLoaded('ESQLEditor');
        await esql.setEsqlEditorQuery('FROM logstash-* | WHERE geo.dest == ?variable');
        await find.clickByButtonText('Run query');
        await find.byButtonText('Refresh');
        await find.clickByButtonText('Apply and close');

        // Wait for the control to be added
        await dashboard.waitForRenderComplete();

        await retry.try(async () => {
          const controlGroupVisible = await testSubjects.exists('controls-group-wrapper');
          expect(controlGroupVisible).to.be(true);
        });

        // Hover over the embeddable and explore in discover
        await dashboardPanelActions.clickPanelAction(
          'embeddablePanelAction-ACTION_OPEN_IN_DISCOVER'
        );

        // Verify that we are in discover
        const [, discoverHandle] = await browser.getAllWindowHandles();
        await browser.switchToWindow(discoverHandle);

        await discover.expectOnDiscover();

        // Verify that the control exists in discover
        const control = await dashboardControls.getControlElementById(createdControlId);
        expect(control).to.be.ok();
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
