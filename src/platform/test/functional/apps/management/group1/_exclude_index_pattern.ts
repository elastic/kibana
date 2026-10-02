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

/**
 * Migration recommendation: MIGRATE TO SCOUT. The inclusion/exclusion expression is validated
 * through the Data Views UI against real index mappings, which is the right end-to-end boundary.
 * The serverless FTR duplicate at x-pack/platform/test/serverless/functional/test_suites/
 * management/data_views/_exclude_index_pattern.ts is not independent coverage: migrate this once
 * with deployment tags, then delete both FTR copies after parity.
 */
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['settings']);
  const es = getService('es');
  const security = getService('security');

  describe('creating and deleting default index', function describeIndexTests() {
    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'index_a', 'index_b']);
      await PageObjects.settings.navigateTo();
      await es.transport.request({
        path: '/index-a/_doc',
        method: 'POST',
        body: { user: 'matt' },
      });

      await es.transport.request({
        path: '/index-b/_doc',
        method: 'POST',
        body: { title: 'hello' },
      });
      await PageObjects.settings.createIndexPattern('index-*,-index-b');
    });

    it('data view creation with exclusion', async () => {
      const fieldCount = await PageObjects.settings.getFieldsTabCount();
      // five metafields plus keyword and text version of 'user' field
      expect(parseInt(fieldCount, 10)).to.be(7);
    });

    after(async () => {
      await es.transport.request({
        path: '/index-a',
        method: 'DELETE',
      });
      await es.transport.request({
        path: '/index-b',
        method: 'DELETE',
      });
      await PageObjects.settings.removeIndexPattern();
      await security.testUser.restoreDefaults();
    });
  });
}
