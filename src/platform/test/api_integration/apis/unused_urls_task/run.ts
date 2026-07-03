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

const isSmartRetryEnabled = () => /^(1|true)$/.test(process.env.FTR_SMART_RETRY_ENABLED ?? '');

const shouldFailSmartRetryProbe = () => {
  if (!isSmartRetryEnabled()) {
    return false;
  }

  return (process.env.BUILDKITE_RETRY_COUNT ?? '0') === '0';
};

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
      const { total: initialUrls } = await kibanaServer.savedObjects.find({ type: 'url' });
      // 6 unused URLs + 1 regular URL
      expect(initialUrls).to.be(7);

      const response1 = await supertest.post('/internal/unused_urls_task/run');

      expect(response1.status).to.be(200);
      // Deletes 5 unused URLs out of 7 total because share.url_expiration.url_limit is set to 5
      expect(response1.body).to.eql({
        message: 'Unused URLs cleanup task has finished.',
        deletedCount: 5,
      });
    });

    it('recovers on smart retry', () => {
      // Probe FTR_SMART_RETRY by failing only on the first smart-retry-enabled attempt.
      if (shouldFailSmartRetryProbe()) {
        throw new Error('FTR smart retry probe failed intentionally on the first attempt');
      }
    });
  });
}
