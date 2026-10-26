/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TestServerlessESUtils } from '@kbn/core-test-helpers-kbn-server';
import { createTestServerlessInstances } from '@kbn/core-test-helpers-kbn-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { getCapabilitiesFromClient } from '@kbn/core-elasticsearch-server-internal';
import { withTimeout } from '@kbn/std';

describe('ES capabilities for serverless ES', () => {
  let serverlessES: TestServerlessESUtils;
  let client: ElasticsearchClient;

  beforeEach(async () => {
    const { startES } = createTestServerlessInstances({
      adjustTimeout: jest.setTimeout,
    });

    serverlessES = await startES();
    client = serverlessES.getClient();
  });

  afterEach(async () => {
    await serverlessES?.stop();
  });

  it('returns the correct capabilities', async () => {
    const outcome = await withTimeout({
      promise: getCapabilitiesFromClient(client),
      timeoutMs: 10_000,
    });
    if (outcome.timedout) {
      throw new Error('Waited 10+ seconds to get capabilities from ES, timed out...');
    }
    const capabilities = outcome.value;
    expect(capabilities).toEqual({
      serverless: true,
    });
  });
});
