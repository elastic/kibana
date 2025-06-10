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
  const listingTable = getService('listingTable');
  const { dashboard } = getPageObjects(['dashboard']);

  describe('dashboard clone', function describeIndexTests() {
    const dashboardName = 'Dashboard Clone Test';
    const clonedDashboardName = dashboardName + ' (1)';

    before(async function () {
      return dashboard.initTests();
    });

    it('Clone saves a copy', async function () {
      await dashboard.clickNewDashboard();
      await dashboard.addVisualizations(dashboard.getTestVisualizationNames());
      await dashboard.saveDashboard(dashboardName);

      await dashboard.duplicateDashboard();
      await dashboard.gotoDashboardLandingPage();
      await listingTable.searchAndExpectItemsCount('dashboard', clonedDashboardName, 1);
    });

    it('the copy should have all the same visualizations', async function () {
      await dashboard.loadSavedDashboard(clonedDashboardName);
      await retry.try(async () => {
        const panelTitles = await dashboard.getPanelTitles();
        expect(panelTitles).to.eql(dashboard.getTestVisualizationNames());
      });
    });

    it('Clone should suggest a unique title', async function () {
      await dashboard.loadSavedDashboard(clonedDashboardName);
      await dashboard.duplicateDashboard();
      await dashboard.gotoDashboardLandingPage();
      await listingTable.searchAndExpectItemsCount('dashboard', `${dashboardName} (2)`, 1);
    });

    it('Clone should always increment from the last duplicated dashboard with a unique title', async function () {
      await dashboard.loadSavedDashboard(clonedDashboardName);
      // force dashboard duplicate id to increment out of logical progression bounds
      await dashboard.duplicateDashboard(`${dashboardName} (20)`);
      await dashboard.gotoDashboardLandingPage();
      await listingTable.searchAndExpectItemsCount('dashboard', `${dashboardName} (20)`, 1);
      // load dashboard with duplication id 1
      await dashboard.loadSavedDashboard(clonedDashboardName);
      // run normal clone
      await dashboard.duplicateDashboard();
      await dashboard.gotoDashboardLandingPage();
      // clone gets duplication id, that picks off from last duplicated dashboard
      await listingTable.searchAndExpectItemsCount('dashboard', `${dashboardName} (21)`, 1);
    });
  });
}
