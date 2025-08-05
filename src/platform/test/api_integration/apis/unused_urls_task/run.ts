/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('run', () => {
    beforeEach(async () => {
      await kibanaServer.importExport.load(
        'src/platform/test/api_integration/fixtures/unused_urls_task/urls.ndjson'
      );
    });

    afterEach(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.unload(
        'src/platform/test/api_integration/fixtures/unused_urls_task/urls.ndjson'
      );
    });

    it('runs unused URLs cleanup if its enabled', async () => {
      const response1 = await supertest.post('/internal/unused_urls_task/run');

      expect(response1.status).to.be(200);
      // Deletes only 5 URLs because the limit is set to 5
      expect(response1.body).to.eql({
        message: 'Unused URLs cleanup task has finished.',
        deletedCount: 5,
      });

      // Delete the remaining URL
      const response2 = await supertest.post('/internal/unused_urls_task/run');

      expect(response2.status).to.be(200);
      expect(response2.body).to.eql({
        message: 'Unused URLs cleanup task has finished.',
        deletedCount: 1,
      });
    });
  });
}
