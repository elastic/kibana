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
import { COMMON_HEADERS, SERVICE_PATH, SERVICE_KEY } from '../fixtures/constants';

// Note: The FTR equivalent only tests the data view API for get_all,
// as the legacy index patterns API doesn't have a get-all endpoint.
apiTest.describe(
  `GET ${SERVICE_PATH} - get all (data view api)`,
  { tag: tags.DEPLOYMENT_AGNOSTIC },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth, log }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
      log.info(`API Key created for admin role: ${adminApiCredentials.apiKey.name}`);
    });

    apiTest(`returns list of ${SERVICE_KEY}s`, async ({ apiClient }) => {
      const response = await apiClient.get(SERVICE_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty(SERVICE_KEY);
      expect(Array.isArray(response.body[SERVICE_KEY])).toBe(true);
    });
  }
);
