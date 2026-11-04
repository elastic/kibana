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
  const { dashboard, header, discover, timePicker, unifiedFieldList } = getPageObjects([
    'dashboard',
    'header',
    'discover',
    'timePicker',
    'unifiedFieldList',
  ]);
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const dashboardAddPanel = getService('dashboardAddPanel');

  describe('saved search on dashboard', function () {
    before(async function () {
      await dashboard.initTests();
      await dashboard.preserveCrossAppState();

      await browser.refresh();
    });

    after(async function () {
      await dashboard.gotoDashboardLandingPage();
    });

    it('Saved search with no changes will update when the saved object changes', async () => {
      await dashboard.gotoDashboardLandingPage();

      await header.clickDiscover();
      await timePicker.setHistoricalDataRange();
      await unifiedFieldList.clickFieldListItemAdd('bytes');
      await discover.saveSearch('my search');
      await header.waitUntilLoadingHasFinished();

      await header.clickDashboard();
      await dashboard.clickNewDashboard();

      await dashboardAddPanel.addSavedSearch('my search');
      await dashboard.saveDashboard('No local edits');

      const inViewMode = await testSubjects.exists('dashboardEditMode');
      expect(inViewMode).to.be(true);

      await header.clickDiscover();
      await unifiedFieldList.clickFieldListItemAdd('agent');
      await discover.saveSearch('my search');
      await header.waitUntilLoadingHasFinished();

      await header.clickDashboard();
      await header.waitUntilLoadingHasFinished();

      const headers = await discover.getColumnHeaders();
      expect(headers.length).to.be(3);
      expect(headers[1]).to.be('bytes');
      expect(headers[2]).to.be('agent');
    });

    it('Saved search with column changes will not update when the saved object changes', async () => {
      await dashboard.switchToEditMode();
      await discover.removeHeaderColumn('bytes');
      await dashboard.saveDashboard('Has local edits');

      await header.clickDiscover();
      await unifiedFieldList.clickFieldListItemAdd('clientip');
      await discover.saveSearch('my search');
      await header.waitUntilLoadingHasFinished();

      await header.clickDashboard();
      await header.waitUntilLoadingHasFinished();

      const headers = await discover.getColumnHeaders();
      expect(headers.length).to.be(2);
      expect(headers[1]).to.be('agent');
    });
  });
}
