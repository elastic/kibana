/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const { common, timePicker, discover } = getPageObjects(['common', 'timePicker', 'discover']);

  describe('discover/tabs', function () {
    before(async function () {
      await browser.setWindowSize(1200, 800);
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
    });

    beforeEach(async () => {
      await common.navigateToApp('home');
      await browser.setLocalStorageItem('discoverExperimental:tabs', 'true');
      await common.navigateToApp('discover');
      await discover.waitUntilTabIsLoaded();
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await esArchiver.unload(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.uiSettings.unset('defaultIndex');
      await kibanaServer.savedObjects.cleanStandardList();
    });

    loadTestFile(require.resolve('./_restorable_state'));
  });
}
