/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

/**
 * Migration recommendation: MIGRATE TO SCOUT. The Data Views listing wires its no-data prompt to
 * useOnTryESQL(), which resolves DISCOVER_ESQL_LOCATOR and navigates to Discover with `FROM logs*`.
 * This is the only e2e coverage of that locator path. The Scout no_data.spec.ts (Discover tabs)
 * and dashboard_esql_no_data.spec.ts click the same `tryESQLLink`, but both go through their own
 * app-specific onTryESQL handlers (seeding `FROM logs* | SORT @timestamp DESC`), and
 * no_data_views.component.test.tsx only asserts the callback fires with a mock.
 */
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const esql = getService('esql');
  const PageObjects = getPageObjects(['settings', 'common', 'discover']);

  describe('No Data Views: Try ES|QL', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('navigates to Discover and presents an ES|QL query', async () => {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();

      await testSubjects.existOrFail('noDataViewsPrompt');
      await testSubjects.click('tryESQLLink');

      await PageObjects.discover.expectOnDiscover();
      await esql.expectEsqlStatement('FROM logs*');
    });
  });
}
