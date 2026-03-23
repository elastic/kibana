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

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const { dashboard, timePicker } = getPageObjects(['dashboard', 'common', 'timePicker']);
  const dashboardName = 'dashboard with filter';
  const copyOfDashboardName = `Copy of ${dashboardName}`;
  const security = getService('security');

  describe('dashboard view edit mode', function viewEditModeTests() {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader', 'animals']);
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await dashboard.navigateToApp();
      await dashboard.preserveCrossAppState();
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('existing dashboard opens in last used view mode', async function () {
      await dashboard.loadSavedDashboard(dashboardName);
      expect(await dashboard.getIsInViewMode()).to.equal(true);

      await dashboard.switchToEditMode();

      await dashboard.loadSavedDashboard(dashboardName);
      expect(await dashboard.getIsInViewMode()).to.equal(false);

      await dashboard.loadSavedDashboard('few panels');
      expect(await dashboard.getIsInViewMode()).to.equal(false);

      await dashboard.clickCancelOutOfEditMode();
    });

    it('create new dashboard opens in edit mode', async function () {
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();
      const isInViewMode = await dashboard.getIsInViewMode();
      expect(isInViewMode).to.be(false);
    });

    describe('save as new', () => {
      it('keeps duplicated dashboard in edit mode', async () => {
        await dashboard.loadDashboardInEditMode(dashboardName);
        await dashboard.duplicateDashboard(copyOfDashboardName);
        const isViewMode = await dashboard.getIsInViewMode();
        expect(isViewMode).to.equal(false);
      });
    });

    describe('save', function () {
      it('keeps dashboard in edit mode', async function () {
        await dashboard.loadDashboardInEditMode(copyOfDashboardName);
        // change dashboard time to cause unsaved change
        await timePicker.setAbsoluteRange(
          'Sep 19, 2013 @ 00:00:00.000',
          'Sep 19, 2013 @ 07:00:00.000'
        );
        await dashboard.saveDashboard(copyOfDashboardName, {
          storeTimeWithDashboard: true,
          saveAsNew: false,
        });
        const isViewMode = await dashboard.getIsInViewMode();
        expect(isViewMode).to.equal(false);
      });
    });
  });
}
