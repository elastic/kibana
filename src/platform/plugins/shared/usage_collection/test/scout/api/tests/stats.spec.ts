/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest } from '../fixtures';

const EXTENDED_STATS_PATH = '/api/stats?extended=true';

// The unauthenticated case relies on `status.allowAnonymous=true`, which only local test servers set.
apiTest.describe('kibana extended stats api', { tag: ['@local-stateful-classic'] }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKey('viewer');
  });

  apiTest('returns extended stats payload for authenticated requests', async ({ apiClient }) => {
    const response = await apiClient.get(EXTENDED_STATS_PATH, {
      headers: credentials.apiKeyHeader,
    });

    expect(response).toHaveStatusCode(200);
    expect(typeof response.body.cluster_uuid).toBe('string');
    expect(typeof response.body.usage).toBe('object');
  });

  apiTest('returns extended stats payload for unauthenticated requests', async ({ apiClient }) => {
    const response = await apiClient.get(EXTENDED_STATS_PATH);

    expect(response).toHaveStatusCode(200);
    expect(typeof response.body.cluster_uuid).toBe('string');
    expect(typeof response.body.usage).toBe('object');
  });
});
