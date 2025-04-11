/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import kbnRison from '@kbn/rison';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'discover']);
  const testSubjects = getService('testSubjects');
  const dataViews = getService('dataViews');
  const dataGrid = getService('dataGrid');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  const currentTimeFrame = {
    from: '2015-09-20T01:00:00.000Z',
    to: '2015-09-24T16:30:00.000Z',
  };

  describe('extension getPaginationConfig', () => {
    before(async () => {
      // To load more than 500 records
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.uiSettings.update({
        'timepicker:timeDefaults': `{ "from": "${currentTimeFrame.from}", "to": "${currentTimeFrame.to}"}`,
      });
    });

    after(async () => {
      await esArchiver.unload(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
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
  });
}
