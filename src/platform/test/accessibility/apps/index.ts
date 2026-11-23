/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const sampleData = getService('sampleData');

  describe('a11y tests', function () {
    describe('using flights sample data', function () {
      before(async () => {
        await sampleData.testResources.installKibanaSampleData('flights');
      });

      after(async () => {
        await sampleData.testResources.removeKibanaSampleData('flights');
        await kibanaServer.uiSettings.unset('defaultIndex');
        await kibanaServer.savedObjects.clean({
          types: ['search', 'index-pattern', 'visualization', 'dashboard'],
        });
      });

      loadTestFile(require.resolve('./dashboard'));
      loadTestFile(require.resolve('./filter_panel'));
      loadTestFile(require.resolve('./visualize'));
    });
  });
}
