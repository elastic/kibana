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

const EXISTING_INDICES_PATH = 'internal/data_views/_existing_indices';

// Internal APIs use version '1' instead of the public API version '2023-10-31'
const INTERNAL_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  [ELASTIC_HTTP_VERSION_HEADER]: '1',
};

apiTest.describe(
  `GET /${EXISTING_INDICES_PATH} - params`,
  { tag: tags.DEPLOYMENT_AGNOSTIC },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth, log }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
      log.info(`API Key created for admin role: ${adminApiCredentials.apiKey.name}`);
    });

    apiTest('requires a query param', async ({ apiClient }) => {
      const response = await apiClient.get(EXISTING_INDICES_PATH, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(400);
    });

    apiTest('accepts indices param as single index string', async ({ apiClient }) => {
      const response = await apiClient.get(`${EXISTING_INDICES_PATH}?indices=filebeat-*`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);
    });

    apiTest('accepts indices param as single index array', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('indices', 'filebeat-*');
      const response = await apiClient.get(`${EXISTING_INDICES_PATH}?${params.toString()}`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);
    });

    apiTest('accepts indices param as array', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('indices', 'filebeat-*');
      params.append('indices', 'packetbeat-*');
      const response = await apiClient.get(`${EXISTING_INDICES_PATH}?${params.toString()}`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);
    });

    apiTest('rejects unexpected query params', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${EXISTING_INDICES_PATH}?unexpectedParam=unexpectedValue`,
        {
          headers: {
            ...INTERNAL_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        }
      );

      expect(response.statusCode).toBe(400);
    });

    apiTest('rejects a comma-separated list of indices', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${EXISTING_INDICES_PATH}?indices=filebeat-*,packetbeat-*`,
        {
          headers: {
            ...INTERNAL_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        }
      );

      expect(response.statusCode).toBe(400);
    });
  }
);
