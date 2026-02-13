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
  const dataGrid = getService('dataGrid');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const filterBar = getService('filterBar');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const globalNav = getService('globalNav');
  const testSubjects = getService('testSubjects');
  const { dashboard, header, timePicker, discover } = getPageObjects([
    'dashboard',
    'header',
    'timePicker',
    'discover',
  ]);

  describe('discover ES|QL embeddable', () => {
    before(async () => {
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
    });

    after(async () => {
      await timePicker.resetDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.importExport.unload(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await kibanaServer.savedObjects.cleanStandardList();
    });

    beforeEach(async () => {
      await dashboard.navigateToApp();
      await filterBar.ensureFieldEditorModalIsClosed();
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();
    });

    it('should add an ES|QL based Discover session panel to a dashboard', async () => {
      await dashboardAddPanel.addSavedSearch('ES|QL Discover Session');
      await header.waitUntilLoadingHasFinished();
      await dashboard.waitForRenderComplete();
      await dashboard.verifyNoRenderErrors();
      expect(await dataGrid.getDocCount()).to.be(1000);
    });

    it('can edit a session and return to the dashboard', async () => {
      await dashboardAddPanel.addSavedSearch('ES|QL Discover Session');
      await dashboardPanelActions.clickEdit();
      await header.waitUntilLoadingHasFinished();
      // Run validations concurrently
      await Promise.all([
        globalNav
          .getFirstBreadcrumb()
          .then((firstBreadcrumb) => expect(firstBreadcrumb).to.be('Dashboards')),
        discover
          .getSavedSearchTitle()
          .then((lastBreadcrumb) => expect(lastBreadcrumb).to.be('Editing ES|QL Discover Session')),
        testSubjects
          .exists('unifiedTabs_tabsBar', { timeout: 1000 })
          .then((unifiedTabs) => expect(unifiedTabs).to.be(true)),
        discover.isOnDashboardsEditMode().then((editMode) => expect(editMode).to.be(true)),
      ]);
      await discover.saveSearch('ES|QL Discover Session');
      await dashboard.waitForRenderComplete();
      await dashboard.verifyNoRenderErrors();
      expect(await dataGrid.getDocCount()).to.be(1000);
    });

    it('can edit a by-value session and return to the dashboard', async () => {
      await dashboardAddPanel.addSavedSearch('ES|QL Discover Session');
      await dashboardPanelActions.clickPanelAction('embeddablePanelAction-unlinkFromLibrary');
      await dashboardPanelActions.clickEdit();
      await header.waitUntilLoadingHasFinished();
      // Run validations concurrently
      await Promise.all([
        globalNav
          .getFirstBreadcrumb()
          .then((firstBreadcrumb) => expect(firstBreadcrumb).to.be('Dashboards')),
        discover
          .getSavedSearchTitle()
          .then((lastBreadcrumb) => expect(lastBreadcrumb).to.be('Editing ES|QL Discover Session')),
        testSubjects
          .exists('unifiedTabs_tabsBar', { timeout: 1000 })
          .then((unifiedTabs) => expect(unifiedTabs).not.to.be(true)),
        discover.isOnDashboardsEditMode().then((editMode) => expect(editMode).to.be(true)),
      ]);
      await discover.clickSaveSearchButton();
      await dashboard.waitForRenderComplete();
      await dashboard.verifyNoRenderErrors();
      expect(await dataGrid.getDocCount()).to.be(1000);
    });
  });
}
