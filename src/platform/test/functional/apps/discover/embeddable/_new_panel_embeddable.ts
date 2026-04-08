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
  const filterBar = getService('filterBar');
  const queryBar = getService('queryBar');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const globalNav = getService('globalNav');
  const { common, dashboard, header, discover } = getPageObjects([
    'common',
    'dashboard',
    'header',
    'discover',
  ]);

  describe('add new discover panel embeddable', () => {
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

    describe('New Panel button', () => {
      beforeEach(async () => {
        await dashboard.navigateToApp();
        await filterBar.ensureFieldEditorModalIsClosed();
        await dashboard.gotoDashboardLandingPage();
        await dashboard.clickNewDashboard();
      });

      it('can add a new Discover session panel to the dashboard', async () => {
        await dashboardAddPanel.clickAddDiscoverPanel();
        await header.waitUntilLoadingHasFinished();
        await Promise.all([
          globalNav
            .getFirstBreadcrumb()
            .then((firstBreadcrumb) => expect(firstBreadcrumb).to.be('Dashboards')),
          discover
            .getSavedSearchTitle()
            .then((lastBreadcrumb) => expect(lastBreadcrumb).to.be('Editing New Discover session')),
          testSubjects
            .exists('unifiedTabs_tabsBar', { timeout: 1000 })
            .then((unifiedTabs) => expect(unifiedTabs).not.to.be(true)),
          discover.isOnDashboardsEditMode().then((editMode) => expect(editMode).to.be(true)),
        ]);

        await queryBar.setQuery('test');
        await queryBar.submitQuery();
        await discover.waitUntilTabIsLoaded();
        await discover.clickSaveSearchButton();
        await dashboard.waitForRenderComplete();
        await dashboard.verifyNoRenderErrors();
        expect(await discover.getAllSavedSearchDocumentCount()).to.eql(['13 documents']);
      });

      it('can cancel adding a new Discover session panel', async () => {
        await dashboardAddPanel.clickAddDiscoverPanel();
        await header.waitUntilLoadingHasFinished();

        await queryBar.setQuery('test');
        await queryBar.submitQuery();
        await discover.waitUntilTabIsLoaded();

        await discover.clickCancelButton();

        await dashboard.waitForRenderComplete();
        await dashboard.verifyNoRenderErrors();

        expect(await discover.getAllSavedSearchDocumentCount()).to.eql([]);
      });
    });

    describe('Save Discover Table Button', () => {
      it('can save to a new Dashboard from Discover', async () => {
        await discover.navigateToApp();
        await discover.clickNewSearchButton();
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        await queryBar.setQuery('test');
        await queryBar.submitQuery();
        await discover.waitUntilTabIsLoaded();

        await discover.clickSaveDiscoverTableToDashboard('By-Value Table');

        await dashboard.waitForRenderComplete();
        await dashboard.verifyNoRenderErrors();
        expect(await discover.getAllSavedSearchDocumentCount()).to.eql(['13 documents']);
      });
    });
  });
}
