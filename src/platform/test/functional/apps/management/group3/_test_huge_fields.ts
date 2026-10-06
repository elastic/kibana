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
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'home', 'settings']);

  // Migration recommendation: MIGRATE TO SCOUT (borderline)
  // Single test: loads the `large_fields` ES archive (a `testhuge` index with 10 006 fields),
  // creates a data view, and asserts the Fields tab badge shows '10006'. The badge value comes
  // directly from the field caps API count, with no complex UI aggregation — so the assertion
  // could alternatively live in an API integration test. The reason to keep it as Scout is that
  // it acts as a scale regression guard: if field caps responses are ever truncated or paginated
  // without the UI handling it, this is the test that catches it end-to-end. Tagged `skipCloud`
  // (resource-intensive index) — that constraint must be preserved in Scout (via tag or config-level
  // exclusion). Requires the `test_testhuge_reader` role and the `large_fields` ES archive.
  describe('test large number of fields', function () {
    this.tags(['skipCloud']);

    const EXPECTED_FIELD_COUNT = '10006';
    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'test_testhuge_reader']);
      await esArchiver.emptyKibanaIndex();
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/large_fields'
      );
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.createIndexPattern('testhuge', 'date');
    });

    it('test_huge data should have expected number of fields', async function () {
      const tabCount = await PageObjects.settings.getFieldsTabCount();
      expect(tabCount).to.be(EXPECTED_FIELD_COUNT);
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await esArchiver.unload('src/platform/test/functional/fixtures/es_archiver/large_fields');
    });
  });
}
