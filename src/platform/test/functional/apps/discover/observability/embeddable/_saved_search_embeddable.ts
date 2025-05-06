/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dataGrid = getService('dataGrid');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const { common, dashboard, header } = getPageObjects(['common', 'dashboard', 'header']);

  const from = 'Sep 22, 2015 @ 00:00:00.000';
  const to = 'Sep 23, 2015 @ 00:00:00.000';

  describe('discover/observability saved search embeddable', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/dashboard/current/data'
      );
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });

      await common.setTime({
        from,
        to,
      });
      await dashboard.navigateToApp();
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();
    });

    after(async () => {
      await common.unsetTime();
      await esArchiver.unload(
        'src/platform/test/functional/fixtures/es_archiver/dashboard/current/data'
      );
      await esArchiver.unload(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.savedObjects.cleanStandardList();
    });

    const addSearchEmbeddableToDashboard = async () => {
      await dashboardAddPanel.addSavedSearch('Rendering-Test:-saved-search');
      await header.waitUntilLoadingHasFinished();
      await dashboard.waitForRenderComplete();
      const rows = await dataGrid.getDocTableRows();
      expect(rows.length).to.be.above(0);
    };

    it('should render content with singlePage pagination mode', async () => {
      await addSearchEmbeddableToDashboard();

      // Pagination toolbar should not be visible
      await testSubjects.missingOrFail('tablePaginationPopoverButton');
      await testSubjects.missingOrFail('pagination-button-previous');
      await testSubjects.missingOrFail('pagination-button-next');

      // Scroll to the bottom of the page
      await dataGrid.scrollTo(500, 1500); // Ugly hack to add 1500 to the current scroll position due to virtualized table adding unexpected ordered rows

      // Check the pagination footer loads
      await testSubjects.existOrFail('unifiedDataTableFooter');
    });
  });
}
