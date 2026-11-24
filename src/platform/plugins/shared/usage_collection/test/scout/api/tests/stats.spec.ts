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
import { apiTest, legacyStatsResponseSchema, statsResponseSchema } from '../fixtures';

const STATS_PATH = '/api/stats';
const UUID_LENGTH = 36;

// The unauthenticated cases rely on `status.allowAnonymous=true`, which only local test servers set.
apiTest.describe('kibana stats api', { tag: ['@local-stateful-classic'] }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKey('viewer');
  });

  apiTest(
    'returns stats without cluster_uuid when no query params are set',
    async ({ apiClient }) => {
      const response = await apiClient.get(STATS_PATH, { headers: credentials.apiKeyHeader });

      expect(response).toHaveStatusCode(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body.cluster_uuid).toBeUndefined();
      expect(response.body.kibana.uuid).toHaveLength(UUID_LENGTH);
      expect(() => statsResponseSchema.validate(response.body)).not.toThrow();
    }
  );

  apiTest('returns stats without cluster_uuid when extended is false', async ({ apiClient }) => {
    const response = await apiClient.get(`${STATS_PATH}?extended=false`, {
      headers: credentials.apiKeyHeader,
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.cluster_uuid).toBeUndefined();
    expect(() => statsResponseSchema.validate(response.body)).not.toThrow();
  });

  apiTest('returns stats without authentication', async ({ apiClient }) => {
    const response = await apiClient.get(STATS_PATH);

    expect(response).toHaveStatusCode(200);
    expect(response.body.kibana.uuid).toHaveLength(UUID_LENGTH);
  });

  apiTest('returns cluster_uuid and usage when extended is present', async ({ apiClient }) => {
    const response = await apiClient.get(`${STATS_PATH}?extended`, {
      headers: credentials.apiKeyHeader,
    });

    expect(response).toHaveStatusCode(200);
    expect(typeof response.body.cluster_uuid).toBe('string');
    expect(response.body.usage).toStrictEqual({});
    expect(response.body.kibana.uuid).toHaveLength(UUID_LENGTH);
    expect(() => statsResponseSchema.validate(response.body)).not.toThrow();
  });

  apiTest('returns cluster_uuid and usage when extended is true', async ({ apiClient }) => {
    const response = await apiClient.get(`${STATS_PATH}?extended=true`, {
      headers: credentials.apiKeyHeader,
    });

    expect(response).toHaveStatusCode(200);
    expect(typeof response.body.cluster_uuid).toBe('string');
    expect(response.body.usage).toStrictEqual({});
    expect(() => statsResponseSchema.validate(response.body)).not.toThrow();
  });

  apiTest('returns extended stats without authentication', async ({ apiClient }) => {
    const response = await apiClient.get(`${STATS_PATH}?extended=true`);

    expect(response).toHaveStatusCode(200);
    expect(typeof response.body.cluster_uuid).toBe('string');
    expect(response.body.usage).toStrictEqual({});
  });

  apiTest(
    'returns extended stats in the old format when legacy is present',
    async ({ apiClient }) => {
      const response = await apiClient.get(`${STATS_PATH}?extended&legacy`, {
        headers: credentials.apiKeyHeader,
      });

      expect(response).toHaveStatusCode(200);
      expect(typeof response.body.clusterUuid).toBe('string');
      expect(response.body.usage).toStrictEqual({});
      expect(response.body.kibana.uuid).toHaveLength(UUID_LENGTH);
      expect(() => legacyStatsResponseSchema.validate(response.body)).not.toThrow();
    }
  );

  apiTest('returns an empty usage object when exclude_usage is present', async ({ apiClient }) => {
    const response = await apiClient.get(`${STATS_PATH}?extended&exclude_usage`, {
      headers: credentials.apiKeyHeader,
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.usage).toStrictEqual({});
  });

  apiTest(
    'returns an empty usage object when exclude_usage and legacy are present',
    async ({ apiClient }) => {
      const response = await apiClient.get(`${STATS_PATH}?extended&exclude_usage&legacy`, {
        headers: credentials.apiKeyHeader,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.usage).toStrictEqual({});
    }
  );
});
