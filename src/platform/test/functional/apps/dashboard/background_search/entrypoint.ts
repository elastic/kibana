/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dashboardName = 'dashboard with filter';

  const { dashboard } = getPageObjects(['dashboard', 'common', 'timePicker']);
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');

  describe('dashboard background search', function () {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader', 'animals']);
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await kibanaServer.savedObjects.cleanStandardList();
    });

    beforeEach(async () => {
      await dashboard.navigateToApp();
      await dashboard.preserveCrossAppState();
    });

    describe('when in edit mode', () => {
      describe('when clicking the open background search flyout button', () => {
        it('opens the background search flyout', async () => {
          await dashboard.gotoDashboardEditMode(dashboardName);

          await testSubjects.click('backgroundSearchButton');
          await testSubjects.exists('searchSessionsMgmtUiTable');
        });
      });
    });

    describe('when in view mode', () => {
      describe('when clicking the open background search flyout button', () => {
        it('opens the background search flyout', async () => {
          await dashboard.loadSavedDashboard(dashboardName);

          await testSubjects.click('backgroundSearchButton');
          await testSubjects.exists('searchSessionsMgmtUiTable');
        });
      });
    });
  });
}
