/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect, apiTest, tags } from '@kbn/scout';
import type { RoleApiCredentials } from '@kbn/scout';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

// Internal APIs use a specific version header
const INTERNAL_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  [ELASTIC_HTTP_VERSION_HEADER]: '1',
};

const RESOLVE_INDEX_PATH = 'internal/index-pattern-management/resolve_index';

apiTest.describe('Resolve index API', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  let adminApiCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, log }) => {
    adminApiCredentials = await requestAuth.getApiKey('admin');
    log.info(`API Key created for admin role: ${adminApiCredentials.apiKey.name}`);
  });

  apiTest('should return 200 for a search for indices with wildcard', async ({ apiClient }) => {
    const response = await apiClient.get(`${RESOLVE_INDEX_PATH}/test*`, {
      headers: {
        ...INTERNAL_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);
  });

  apiTest('should return 404 when no indices match', async ({ apiClient }) => {
    const response = await apiClient.get(`${RESOLVE_INDEX_PATH}/test`, {
      headers: {
        ...INTERNAL_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response.statusCode).toBe(404);
  });

  apiTest('should return 404 when cluster is not found', async ({ apiClient }) => {
    const response = await apiClient.get(
      `${RESOLVE_INDEX_PATH}/cluster1:filebeat-*,cluster2:filebeat-*`,
      {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      }
    );

    expect(response.statusCode).toBe(404);
  });
});
