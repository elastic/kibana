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
  const dashboardAddPanel = getService('dashboardAddPanel');
  const esArchiver = getService('esArchiver');
  const filterBar = getService('filterBar');
  const find = getService('find');
  const kibanaServer = getService('kibanaServer');
  const queryBar = getService('queryBar');
  const testSubjects = getService('testSubjects');
  const { common, dashboard, discover, header } = getPageObjects([
    'common',
    'dashboard',
    'discover',
    'header',
  ]);

  describe('Save Discover session to dashboard', () => {
    before(async () => {
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/dashboard/current/data'
      );
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await common.setTime({
        from: 'Sep 22, 2015 @ 00:00:00.000',
        to: 'Sep 23, 2015 @ 00:00:00.000',
      });
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await common.unsetTime();
      await kibanaServer.uiSettings.unset('defaultIndex');
    });

    describe('from standalone Discover', () => {
      it('can save a new session with None option to the library', async () => {
        await discover.navigateToApp();
        await discover.clickNewSearchButton();
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        await queryBar.setQuery('test');
        await queryBar.submitQuery();
        await discover.waitUntilTabIsLoaded();

        await discover.clickSaveSearchButton();
        await testSubjects.existOrFail('add-to-dashboard-options');
        await discover.inputSavedSearchTitle('Library Only Session');
        await discover.clickConfirmSavedSearch();
        await header.waitUntilLoadingHasFinished();

        expect(await discover.getSavedSearchTitle()).to.be('Library Only Session');
        await testSubjects.missingOrFail('dashboardViewport');
      });

      it('can save a new session to a new dashboard', async () => {
        await discover.navigateToApp();
        await discover.clickNewSearchButton();
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        await queryBar.setQuery('test');
        await queryBar.submitQuery();
        await discover.waitUntilTabIsLoaded();

        await discover.saveSearchToDashboard('Session for New Dashboard', 'new');

        await dashboard.waitForRenderComplete();
        await dashboard.verifyNoRenderErrors();
        expect(await discover.getAllSavedSearchDocumentCount()).to.eql(['13 documents']);
        await dashboard.saveDashboard('New Dashboard With Session');
      });

      it('can save a new session to an existing dashboard', async () => {
        const existingDashboardName = 'Existing Target Dashboard';

        await dashboard.navigateToApp();
        await dashboard.gotoDashboardLandingPage();
        await dashboard.clickNewDashboard();
        await dashboard.saveDashboard(existingDashboardName);

        await discover.navigateToApp();
        await discover.clickNewSearchButton();
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        await queryBar.setQuery('test');
        await queryBar.submitQuery();
        await discover.waitUntilTabIsLoaded();

        await discover.saveSearchToDashboard('Session for Existing Dashboard', {
          existing: existingDashboardName,
        });

        await dashboard.waitForRenderComplete();
        await dashboard.verifyNoRenderErrors();
        expect(await discover.getAllSavedSearchDocumentCount()).to.eql(['13 documents']);
      });

      it('can save as a copy to a new dashboard via Save As menu', async () => {
        await discover.navigateToApp();
        await discover.clickNewSearchButton();
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        await queryBar.setQuery('test');
        await queryBar.submitQuery();
        await discover.waitUntilTabIsLoaded();

        await discover.saveSearch('Original Session for Copy');

        await discover.saveSearchToDashboard('Copied Session for Dashboard', 'new', {
          saveAsNew: true,
        });

        await dashboard.waitForRenderComplete();
        await dashboard.verifyNoRenderErrors();
        expect(await discover.getAllSavedSearchDocumentCount()).to.eql(['13 documents']);
        await dashboard.saveDashboard('New Dashboard With Copied Session');
      });

      it('can save as a copy to a new dashboard via "Save as new Discover session" toggle', async () => {
        await discover.navigateToApp();
        await discover.clickNewSearchButton();
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        await queryBar.setQuery('test');
        await queryBar.submitQuery();
        await discover.waitUntilTabIsLoaded();

        await discover.saveSearch('Session for Checkbox Copy');

        await discover.clickSaveSearchButton();
        await testSubjects.missingOrFail('add-to-dashboard-options');

        await testSubjects.setEuiSwitch('saveAsNewCheckbox', 'check');
        await testSubjects.existOrFail('add-to-dashboard-options');

        await discover.inputSavedSearchTitle('Checkbox Copy Session');
        await find.clickByCssSelector('#new-dashboard-option');
        await discover.clickConfirmSavedSearch();
        await header.waitUntilLoadingHasFinished();

        await dashboard.waitForRenderComplete();
        await dashboard.verifyNoRenderErrors();
        expect(await discover.getAllSavedSearchDocumentCount()).to.eql(['13 documents']);
      });
    });

    describe('from the embedded editor', () => {
      beforeEach(async () => {
        await dashboard.navigateToApp();
        await filterBar.ensureFieldEditorModalIsClosed();
        await dashboard.gotoDashboardLandingPage();
        await dashboard.clickNewDashboard();
      });

      it('can save a new session from the embedded editor and return to the dashboard', async () => {
        await dashboardAddPanel.clickAddDiscoverPanel();
        await header.waitUntilLoadingHasFinished();

        expect(await discover.isOnDashboardsEditMode()).to.be(true);

        await queryBar.setQuery('test');
        await queryBar.submitQuery();
        await discover.waitUntilTabIsLoaded();

        await discover.clickSaveSearchButton();

        await dashboard.waitForRenderComplete();
        await dashboard.verifyNoRenderErrors();
        expect(await discover.getAllSavedSearchDocumentCount()).to.eql(['13 documents']);
      });

      it('can edit an existing session in the embedded editor and return to the dashboard', async () => {
        await dashboardAddPanel.addSavedSearch('Rendering Test: saved search');
        await header.waitUntilLoadingHasFinished();
        await dashboard.waitForRenderComplete();

        expect(await discover.getSavedSearchDocumentCount()).to.be('4,633 documents');

        await discover.editEmbeddableInDiscover();
        expect(await discover.isOnDashboardsEditMode()).to.be(true);

        await queryBar.setQuery('test');
        await queryBar.submitQuery();
        await discover.waitUntilTabIsLoaded();

        await discover.saveSearch('Rendering Test: saved search');

        await dashboard.waitForRenderComplete();
        await dashboard.verifyNoRenderErrors();
        expect(await discover.getSavedSearchDocumentCount()).to.be('13 documents');
      });

      it('can save as a copy from the embedded editor to a new dashboard', async () => {
        await dashboardAddPanel.addSavedSearch('Rendering Test: saved search');
        await header.waitUntilLoadingHasFinished();
        await dashboard.waitForRenderComplete();

        await discover.editEmbeddableInDiscover();
        expect(await discover.isOnDashboardsEditMode()).to.be(true);

        await queryBar.setQuery('test');
        await queryBar.submitQuery();
        await discover.waitUntilTabIsLoaded();

        await discover.saveSearchToDashboard('Copied Rendering Test', 'new', {
          saveAsNew: true,
        });

        await dashboard.waitForRenderComplete();
        await dashboard.verifyNoRenderErrors();
        expect(await discover.getAllSavedSearchDocumentCount()).to.eql(['13 documents']);
      });
    });
  });
}
