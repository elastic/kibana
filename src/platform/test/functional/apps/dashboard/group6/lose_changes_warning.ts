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
  const queryBar = getService('queryBar');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardSettings = getService('dashboardSettings');
  const { dashboard, common, timePicker } = getPageObjects(['dashboard', 'common', 'timePicker']);
  const dashboardName = 'dashboard with filter';
  const filterBar = getService('filterBar');
  const security = getService('security');

  describe('shows lose changes warning when switching from edit mode to view mode', function viewEditModeTests() {
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

    describe('resets changes on confirmation', function () {
      beforeEach(async function () {
        await dashboard.loadDashboardInEditMode(dashboardName);
      });

      it('when time changed is stored with dashboard', async function () {
        const originalTime = await timePicker.getTimeConfig();

        await timePicker.setAbsoluteRange(
          'Sep 19, 2013 @ 06:31:44.000',
          'Sep 19, 2013 @ 06:31:44.000'
        );
        await dashboard.clickCancelOutOfEditMode();

        const newTime = await timePicker.getTimeConfig();

        expect(newTime.start).to.not.equal('Sep 19, 2013 @ 06:31:44.000');
        expect(newTime.start).to.not.equal('Sep 19, 2013 @ 06:31:44.000');
        expect(newTime.start).to.equal(originalTime.start);
        expect(newTime.end).to.equal(originalTime.end);
      });

      it('when the query is edited and applied', async function () {
        const originalQuery = await queryBar.getQueryString();
        await queryBar.setQuery(`${originalQuery}and extra stuff`);
        await queryBar.submitQuery();

        await dashboard.clickCancelOutOfEditMode();

        const query = await queryBar.getQueryString();
        expect(query).to.equal(originalQuery);
      });

      it('when a filter is deleted', async function () {
        let hasFilter = await filterBar.hasFilter('animal', 'dog');
        expect(hasFilter).to.be(true);

        await filterBar.removeFilter('animal');

        hasFilter = await filterBar.hasFilter('animal', 'dog');
        expect(hasFilter).to.be(false);

        await dashboard.clickCancelOutOfEditMode();

        hasFilter = await filterBar.hasFilter('animal', 'dog');
        expect(hasFilter).to.be(true);
      });

      it('when a panel is added', async function () {
        const originalPanelCount = await dashboard.getPanelCount();

        await dashboardAddPanel.addVisualization('Rendering Test: guage');
        await dashboard.clickCancelOutOfEditMode();

        const panelCount = await dashboard.getPanelCount();
        expect(panelCount).to.eql(originalPanelCount);
      });
    });

    describe('preserves edits on cancel', function () {
      it('when time changed is stored with dashboard', async function () {
        await dashboard.loadDashboardInEditMode(dashboardName);
        await timePicker.setAbsoluteRange(
          'Sep 19, 2013 @ 06:31:44.000',
          'Sep 19, 2013 @ 06:31:44.000'
        );

        await dashboard.clickCancelOutOfEditMode(false);

        await common.clickCancelOnModal();

        const time = await timePicker.getTimeConfig();

        expect(time.start).to.equal('Sep 19, 2013 @ 06:31:44.000');
        expect(time.end).to.equal('Sep 19, 2013 @ 06:31:44.000');
      });
    });

    describe('Does not show lose changes warning when there are no unsaved changes', function () {
      beforeEach(async function () {
        await dashboard.loadDashboardInEditMode(dashboardName);
      });

      it('when time changed is not stored with dashboard', async function () {
        await dashboard.openSettingsFlyout();
        await dashboardSettings.toggleStoreTimeWithDashboard(false);
        await dashboardSettings.clickApplyButton();
        await dashboard.saveDashboard(dashboardName, {
          saveAsNew: false,
        });
        await timePicker.setAbsoluteRange(
          'Oct 19, 2014 @ 06:31:44.000',
          'Dec 19, 2014 @ 06:31:44.000'
        );
        await dashboard.clickCancelOutOfEditMode(false);

        await common.expectConfirmModalOpenState(false);
      });

      // See https://github.com/elastic/kibana/issues/10110 - this is intentional.
      it('when the query is edited but not applied', async function () {
        const originalQuery = await queryBar.getQueryString();
        await queryBar.setQuery(`${originalQuery}extra stuff`);

        await dashboard.clickCancelOutOfEditMode(false);

        await common.expectConfirmModalOpenState(false);

        await dashboard.loadSavedDashboard(dashboardName);
        const query = await queryBar.getQueryString();
        expect(query).to.equal(originalQuery);
      });
    });
  });
}
