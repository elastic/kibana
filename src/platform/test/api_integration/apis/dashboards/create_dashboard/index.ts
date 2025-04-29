/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  describe('dashboards - create', () => {
    before(async () => {
      await kibanaServer.importExport.load(
        'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
      );
      await kibanaServer.importExport.load(
        'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/tags.json'
      );
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.unload(
        'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
      );
      await kibanaServer.importExport.unload(
        'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/tags.json'
      );
    });
    loadTestFile(require.resolve('./main'));
    loadTestFile(require.resolve('./validation'));
  });
}
