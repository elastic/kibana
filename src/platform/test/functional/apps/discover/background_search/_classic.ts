/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const dataViews = getService('dataViews');

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
      describe('when clicking the open background search flyout button', () => {
        it('opens the background search flyout', async () => {
          await testSubjects.click('openBackgroundSearchFlyoutButton');
          await testSubjects.exists('searchSessionsMgmtUiTable');
        });
      });
    });
  });
}
