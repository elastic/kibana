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

  const { dashboard, dashboardControls, discover } = getPageObjects([
    'dashboard',
    'dashboardControls',
    'discover',
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

        // Add a new ES|QL panel
        await dashboard.clickNewDashboard();
        await dashboardAddPanel.clickAddEsqlPanel();

        await find.clickByButtonText('Apply and close');

        // Add a variable control
        await dashboardControls.openControlsMenu();
        await find.clickByButtonText('Variable control');
        await esql.waitESQLEditorLoaded('ESQLEditor');
        await esql.setEsqlEditorQuery('FROM logstash-* | STATS BY geo.dest');

        await testSubjects.click('ESQLEditor-run-query-button');
        expect(await testSubjects.exists('esqlValuesPreview')).to.be(true);
        await testSubjects.click('saveEsqlControlsFlyoutButton');

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
        await dashboardControls.doesControlTitleExist('variable');
      });
    });
  });
}
