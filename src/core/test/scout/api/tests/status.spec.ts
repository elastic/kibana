/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/api';
import { apiTest, tags } from '@kbn/scout';
import type { RoleApiCredentials } from '@kbn/scout';
import { COMMON_HEADERS } from '../fixtures';

// Failing: See https://github.com/elastic/kibana/issues/284046
apiTest.describe.skip('kibana status api', { tag: tags.deploymentAgnostic }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKey('viewer');
  });

  apiTest('returns version, status and metrics fields', async ({ apiClient }) => {
    const response = await apiClient.get('/api/status', {
      headers: {
        ...COMMON_HEADERS,
        ...credentials.apiKeyHeader,
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(String(response.headers['content-type'])).toMatch(/json/);

    const { body } = response;

    expect(typeof body.name).toBe('string');
    expect(typeof body.uuid).toBe('string');
    expect(typeof body.version.number).toBe('string');
    expect(typeof body.version.build_hash).toBe('string');
    expect(typeof body.version.build_number).toBe('number');

    expect(body.status.overall).toBeDefined();
    expect(typeof body.status.overall.level).toBe('string');

    expect(body.status.core).toBeDefined();
    expect(body.status.plugins).toBeDefined();

    expect(typeof body.metrics.collection_interval_in_millis).toBe('number');

    expect(typeof body.metrics.process.memory.heap.total_in_bytes).toBe('number');
    expect(typeof body.metrics.process.memory.heap.used_in_bytes).toBe('number');
    expect(typeof body.metrics.process.memory.heap.size_limit).toBe('number');

    expect(typeof body.metrics.os.load['1m']).toBe('number');
    expect(typeof body.metrics.os.load['5m']).toBe('number');
    expect(typeof body.metrics.os.load['15m']).toBe('number');

    // avg/max may be undefined early in the process lifetime; only null is invalid
    expect(body.metrics.response_times.avg_in_millis).toBeDefined();
    expect(body.metrics.response_times.max_in_millis).toBeDefined();

    expect(typeof body.metrics.requests.total).toBe('number');
    expect(typeof body.metrics.requests.disconnects).toBe('number');
    expect(typeof body.metrics.concurrent_connections).toBe('number');
  });
});
