/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'console', 'header', 'home']);
  const retry = getService('retry');
  const security = getService('security');
  const testSubjects = getService('testSubjects');

  describe('console vector tiles response validation', function describeIndexTests() {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'kibana_sample_admin']);
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.home.addSampleDataSet('logs');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.common.navigateToApp('console');
      await PageObjects.console.skipTourIfExists();
      await PageObjects.console.clearEditorText();
    });

    it('should validate response', async () => {
      await PageObjects.console.enterText(`GET kibana_sample_data_logs/_mvt/geo.coordinates/0/0/0`);
      await PageObjects.console.clickPlay();

      await retry.waitFor('console response status badge to appear', async () => {
        return await testSubjects.exists('consoleResponseStatusBadge');
      });
      await PageObjects.header.waitUntilLoadingHasFinished();

      await retry.try(async () => {
        const actualResponse = await PageObjects.console.getOutputText();
        expect(actualResponse).to.contain('"meta": [');
      });
    });

    after(async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.home.removeSampleDataSet('logs');
      await security.testUser.restoreDefaults();
    });
  });
}
