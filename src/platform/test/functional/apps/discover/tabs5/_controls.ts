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

const savedSession = 'my ESQL session';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { discover, dashboardControls, dashboard, header } = getPageObjects([
    'discover',
    'dashboardControls',
    'dashboard',
    'header',
  ]);
  const retry = getService('retry');
  const esql = getService('esql');
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const dashboardAddPanel = getService('dashboardAddPanel');

  describe('discover - ES|QL controls', function () {
    it('should add an ES|QL value control', async () => {
      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();

      await esql.createEsqlControl('FROM logstash-* | WHERE geo.dest == ');
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        const controlGroupVisible = await testSubjects.exists('controls-group-wrapper');
        expect(controlGroupVisible).to.be(true);
      });

      // Check Discover editor has been updated accordingly
      const editorValue = await esql.getEsqlEditorQuery();
      expect(editorValue).to.contain('FROM logstash-* | WHERE geo.dest == ?geo_dest');

      await discover.waitUntilTabIsLoaded();
    });

    it('should keep the ES|QL control after a browser refresh', async () => {
      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();

      await esql.createEsqlControl('FROM logstash-* | WHERE geo.dest == ');
      await discover.waitUntilTabIsLoaded();

      // Refresh the page
      await browser.refresh();
      await discover.waitUntilTabIsLoaded();
      await retry.try(async () => {
        const controlGroupVisible = await testSubjects.exists('controls-group-wrapper');
        expect(controlGroupVisible).to.be(true);
      });
    });

    it('should save the ES|QL control', async () => {
      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();

      await esql.createEsqlControl('FROM logstash-* | WHERE geo.dest == ');
      await discover.waitUntilTabIsLoaded();
      // Save the search
      await discover.saveSearch(savedSession);
      await discover.waitUntilTabIsLoaded();
      await retry.try(async () => {
        const controlGroupVisible = await testSubjects.exists('controls-group-wrapper');
        expect(controlGroupVisible).to.be(true);
      });
    });

    it('should open a saved session with a control group', async () => {
      // load saved search
      await discover.loadSavedSearch(savedSession);
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        const controlGroupVisible = await testSubjects.exists('controls-group-wrapper');
        expect(controlGroupVisible).to.be(true);
      });
    });

    it('should reset successfully a saved session with a control group', async () => {
      // load saved search
      await discover.loadSavedSearch(savedSession);
      await discover.waitUntilTabIsLoaded();

      // Make a change in the controls
      const controlId = (await dashboardControls.getAllControlIds())[0];
      await dashboardControls.optionsListOpenPopover(controlId, true);
      await dashboardControls.optionsListPopoverSelectOption('CN');

      await discover.waitUntilTabIsLoaded();
      await testSubjects.existOrFail('unsavedChangesBadge');

      await discover.revertUnsavedChanges();
      await testSubjects.missingOrFail('unsavedChangesBadge');
    });

    it('should open the saved session in a dashboard', async () => {
      // Navigate to dashboard
      await dashboard.navigateToApp();
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();

      // Add saved search
      await dashboardAddPanel.addSavedSearch(savedSession);
      await header.waitUntilLoadingHasFinished();
      await dashboard.waitForRenderComplete();

      // Check control is present
      await retry.try(async () => {
        const controlGroupVisible = await testSubjects.exists('controls-group-wrapper');
        expect(controlGroupVisible).to.be(true);
      });
    });
  });
}
