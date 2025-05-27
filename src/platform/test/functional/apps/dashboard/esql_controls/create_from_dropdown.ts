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
  const { dashboard, timePicker, dashboardControls } = getPageObjects([
    'dashboard',
    'timePicker',
    'common',
    'dashboardControls',
    'header',
  ]);
  const testSubjects = getService('testSubjects');
  const esql = getService('esql');

  describe('dashboard - add an ES|QL control from the controls dropdown', function () {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
    });

    after(async () => {
      await dashboard.navigateToApp();
    });

    it('should add an ES|QL control', async () => {
      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();
      await timePicker.setDefaultDataRange();
      await dashboard.switchToEditMode();

      await dashboardControls.openControlsMenu();
      const createESQLControlBtn = await testSubjects.find('esql-control-create-button');
      await createESQLControlBtn.click();

      // Flyout is open
      await esql.waitESQLEditorLoaded('ESQLEditor');
      await esql.setEsqlEditorQuery('FROM logstash-* | STATS BY geo.dest');

      // run the query
      await testSubjects.click('ESQLEditor-run-query-button');
      expect(await testSubjects.exists('esqlValuesPreview')).to.be(true);
      await testSubjects.click('saveEsqlControlsFlyoutButton');

      await dashboard.waitForRenderComplete();

      await retry.try(async () => {
        const controlGroupVisible = await testSubjects.exists('controls-group-wrapper');
        expect(controlGroupVisible).to.be(true);
      });
    });
  });
}
