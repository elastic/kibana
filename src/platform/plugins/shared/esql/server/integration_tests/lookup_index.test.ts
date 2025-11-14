/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { request } from '@kbn/core-test-helpers-kbn-server';
import { EsqlServiceTestbed } from './testbed';

describe('Lookup Index endpoints', () => {
  const testbed = new EsqlServiceTestbed();

  beforeAll(async () => {
    await testbed.start();
  });

  afterAll(async () => {
    await testbed.stop();
  });

  describe('POST /internal/esql/lookup_index/{indexName}/recreate', () => {
    it('can recreate a lookup index', async () => {
      const indexName = 'test_lookup_index_recreate';
      const client = testbed.esClient();

      // Create an index with some data
      await client.indices.create({
        index: indexName,
        settings: {
          mode: 'lookup',
        },
      });

      await client.index({
        index: indexName,
        id: '1',
        document: { name: 'test' },
        refresh: 'wait_for',
      });

      // Verify the document exists
      let searchResult = await client.search({ index: indexName });
      expect(searchResult.hits.total).toMatchObject({ value: 1 });

      // Recreate the index
      const url = `/internal/esql/lookup_index/${indexName}/recreate`;
      const result = await request
        .post(testbed.kibana!.root, url)
        .set('x-elastic-internal-origin', 'esql-test')
        .send()
        .expect(200);

      expect(result.body).toMatchObject({
        acknowledged: true,
        index: indexName,
      });

      // Verify the index was recreated and is empty
      await client.indices.refresh({ index: indexName });
      searchResult = await client.search({ index: indexName });
      expect(searchResult.hits.total).toMatchObject({ value: 0 });

      // Verify it still has lookup mode
      const indexSettings = await client.indices.getSettings({ index: indexName });
      expect(indexSettings[indexName].settings?.index?.mode).toBe('lookup');

      // Cleanup
      await client.indices.delete({ index: indexName });
    });
  });
});
