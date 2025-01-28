/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createTestServers, TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { getCapabilitiesFromClient } from '@kbn/core-elasticsearch-server-internal';

describe('ES capabilities for traditional ES', () => {
  let esServer: TestElasticsearchUtils;
  let client: ElasticsearchClient;

  beforeEach(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'basic',
        },
      },
    });

    esServer = await startES();
    client = esServer.es.getClient();
  });

  afterEach(async () => {
    if (esServer) {
      await esServer.stop();
    }
  });

  it('returns the correct capabilities', async () => {
    const capabilities = await getCapabilitiesFromClient(client);
    expect(capabilities).toEqual({
      serverless: false,
    });
  });
});
