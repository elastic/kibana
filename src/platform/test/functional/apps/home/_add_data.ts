/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'header', 'home', 'dashboard']);

  // Failing: See https://github.com/elastic/kibana/issues/154699
  describe.skip('add data tutorials', function describeIndexTests() {
    it('directory should redirect to integrations app', async () => {
      await PageObjects.common.navigateToUrl('home', 'tutorial_directory', { useActualUrl: true });
      await PageObjects.common.waitUntilUrlIncludes('/app/integrations');
    });
  });
}
