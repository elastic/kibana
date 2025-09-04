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
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const dataViews = getService('dataViews');
  const queryBar = getService('queryBar');
  const retry = getService('retry');
  const find = getService('find');

  const { common, unifiedFieldList, discover } = getPageObjects([
    'common',
    'unifiedFieldList',
    'discover',
  ]);

  describe('Discover background search', function () {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();

      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await esArchiver.load(
        'src/platform/test/functional/fixtures/es_archiver/kibana_sample_data_flights'
      );
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );

      await common.navigateToApp('discover');
      await unifiedFieldList.waitUntilSidebarHasLoaded();
      await dataViews.switchToAndValidate('kibana_sample_data_flights');
      await discover.expandTimeRangeAsSuggestedInNoResultsMessage();
    });

    describe('Classic view', function () {
      it('stores a finished search', async () => {
        const ariaLabel = await testSubjects.getAttribute(
          'querySubmitSplitButton-primary-button',
          'aria-label'
        );
        expect(ariaLabel).to.eql('Refresh query');

        await testSubjects.click('querySubmitSplitButton-secondary-button');

        await retry.waitFor(
          'the toast appears indicating that the search session is saved',
          async () => {
            const element = await find.byButtonText('Check its progress here');
            return !!element;
          }
        );
      });

      it('starts and stores a new search', async () => {
        await queryBar.setQuery('Carrier: "Kibana Airlines"');

        const ariaLabel = await testSubjects.getAttribute(
          'querySubmitSplitButton-primary-button',
          'aria-label'
        );
        expect(ariaLabel).to.eql('Needs updating');

        await testSubjects.click('querySubmitSplitButton-secondary-button');

        await retry.waitFor(
          'the toast appears indicating that the search session is saved',
          async () => {
            const element = await find.byButtonText('Check its progress here');
            return !!element;
          }
        );
      });
    });
  });
}
