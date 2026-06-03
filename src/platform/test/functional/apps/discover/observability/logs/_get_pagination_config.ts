/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import kbnRison from '@kbn/rison';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'discover', 'dashboard', 'header']);
  const testSubjects = getService('testSubjects');
  const dataViews = getService('dataViews');
  const dataGrid = getService('dataGrid');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  const currentTimeFrame = {
    from: '2015-09-20T01:00:00.000Z',
    to: '2015-09-24T16:30:00.000Z',
  };

  describe('extension getPaginationConfig', () => {
    before(async () => {
      await kibanaServer.uiSettings.update({
        'timepicker:timeDefaults': `{ "from": "${currentTimeFrame.from}", "to": "${currentTimeFrame.to}"}`,
      });
    });

    after(async () => {
      await PageObjects.common.unsetTime();
    });

    describe('ES|QL mode', () => {
      it('should render without pagination using a single page', async () => {
        const limit = 200;
        const state = kbnRison.encode({
          dataSource: { type: 'esql' },
          query: { esql: `from logstash* | sort @timestamp desc | limit ${limit}` },
        });
        await PageObjects.common.navigateToActualUrl('discover', `?_a=${state}`, {
          ensureCurrentUrl: false,
        });
        await PageObjects.discover.waitUntilSearchingHasFinished();

        await dataGrid.scrollTo(300);

        await PageObjects.discover.waitUntilSearchingHasFinished();
        // In ESQL Mode, pagination is disabled
        await testSubjects.missingOrFail('tablePaginationPopoverButton');
        await testSubjects.missingOrFail('pagination-button-previous');
        await testSubjects.missingOrFail('pagination-button-next');
      });
    });

    describe('data view mode', () => {
      it('should render default pagination with page numbers', async () => {
        await PageObjects.common.navigateToActualUrl('discover', undefined, {
          ensureCurrentUrl: false,
        });
        await dataViews.createFromSearchBar({
          name: 'lo', // Must be anything but log/logs, since pagination is disabled for log sources
          adHoc: true,
          hasTimeField: true,
        });

        await PageObjects.discover.waitUntilSearchingHasFinished();

        await testSubjects.existOrFail('tablePaginationPopoverButton');
        await testSubjects.existOrFail('pagination-button-previous');
        await testSubjects.existOrFail('pagination-button-next');
        await dataGrid.checkCurrentRowsPerPageToBe(100);
      });

      it('should render single page pagination without page numbers', async () => {
        const defaultPageLimit = 500;
        await PageObjects.common.navigateToActualUrl('discover', undefined, {
          ensureCurrentUrl: false,
        });
        await dataViews.createFromSearchBar({
          name: 'logs',
          adHoc: true,
          hasTimeField: true,
        });
        await PageObjects.discover.waitUntilSearchingHasFinished();

        await testSubjects.missingOrFail('tablePaginationPopoverButton');
        await testSubjects.missingOrFail('pagination-button-previous');
        await testSubjects.missingOrFail('pagination-button-next');

        // Now scroll to bottom to load footer
        await dataGrid.scrollTo(defaultPageLimit);
        await PageObjects.discover.waitUntilSearchingHasFinished();

        await testSubjects.existOrFail('unifiedDataTableFooter');
        await testSubjects.existOrFail('dscGridSampleSizeFetchMoreLink');

        // Clicking on Load more should fetch more data and hide the footer
        const loadMoreButton = await testSubjects.find('dscGridSampleSizeFetchMoreLink');
        await loadMoreButton.click();

        await PageObjects.discover.waitUntilSearchingHasFinished();

        // Scroll needs to be triggered to hide the footer
        await dataGrid.scrollTo(defaultPageLimit + 10);

        await testSubjects.missingOrFail('unifiedDataTableFooter');
        await testSubjects.missingOrFail('dscGridSampleSizeFetchMoreLink');
      });
    });

    describe('saved search embeddable', () => {
      const from = 'Sep 22, 2015 @ 00:00:00.000';
      const to = 'Sep 23, 2015 @ 00:00:00.000';

      before(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await esArchiver.loadIfNeeded(
          'src/platform/test/functional/fixtures/es_archiver/dashboard/current/data'
        );
        await kibanaServer.importExport.load(
          'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
        );
        await kibanaServer.uiSettings.replace({
          defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
        });

        await PageObjects.common.setTime({
          from,
          to,
        });
        await PageObjects.dashboard.navigateToApp();
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await PageObjects.dashboard.clickNewDashboard();
      });

      after(async () => {
        await PageObjects.common.unsetTime();
        await esArchiver.unload(
          'src/platform/test/functional/fixtures/es_archiver/dashboard/current/data'
        );
        await kibanaServer.savedObjects.cleanStandardList();
      });

      const addSearchEmbeddableToDashboard = async () => {
        await dashboardAddPanel.addSavedSearch('Rendering-Test:-saved-search');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.dashboard.waitForRenderComplete();
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
  });
}
