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
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'home', 'settings', 'discover', 'header']);

  // Migration recommendation: MIGRATE TO SCOUT (borderline)
  // Single test: navigates to the Relationships tab of a data view and asserts the count badge
  // shows 1 (one saved search from the discover fixture references logstash-*). The count itself
  // is derived directly from the relationships API response — there is no complex UI logic being
  // exercised — so the tab-navigation + render cycle is the only part that truly requires a browser.
  // This could alternatively be an API integration test for the relationships endpoint plus a
  // component test for the count badge. It is kept as Scout because it is the only coverage for
  // the relationships feature and the tab navigation + loading state is worth a smoke test.
  describe('data view relationships', function describeIndexTests() {
    before(async function () {
      await browser.setWindowSize(1200, 800);
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
    });

    it('Render relationships tab and verify count', async function () {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
      await PageObjects.settings.clickIndexPatternLogstash();
      await PageObjects.settings.clickRelationshipsTab();
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(parseInt(await PageObjects.settings.getRelationshipsTabCount(), 10)).to.be(1);
    });
  });
}
