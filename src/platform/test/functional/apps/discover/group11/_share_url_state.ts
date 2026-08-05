/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Migration recommendation: MIGRATE TO SCOUT — add to src/platform/plugins/shared/discover/test/scout/core/ui/parallel_tests/shared_links.spec.ts
 */
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const dataGrid = getService('dataGrid');
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const { common, discover, timePicker, unifiedFieldList, share } = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'unifiedFieldList',
    'share',
  ]);

  describe('discover share URL state', function () {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update({
        defaultIndex: 'logstash-*',
      });
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.replace({});
    });

    beforeEach(async () => {
      await common.navigateToApp('discover');
      await discover.waitUntilTabIsLoaded();
    });

    it('should round-trip selected columns via share URL', async () => {
      await unifiedFieldList.clickFieldListItemAdd('bytes');
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'bytes']);
      });

      await share.clickShareTopNavButton();
      const sharedUrl = await share.getSharedUrl();
      await share.closeShareModal();

      await browser.openNewTab();
      await browser.get(sharedUrl);
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'bytes']);
      });

      const resolvedUrl = decodeURIComponent(await browser.getCurrentUrl());
      expect(resolvedUrl).to.contain('columns:!(bytes)');
    });
  });
}
