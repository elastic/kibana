/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { COMMON_HEADERS } from '../fixtures/constants';

apiTest.describe(
  'GET /api/console/es_config',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.security.complete,
      ...tags.serverless.observability.complete,
      ...tags.serverless.search,
    ],
  },
  () => {
    let credentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      credentials = await requestAuth.getApiKey('viewer');
    });

    apiTest('returns es host', async ({ apiClient }) => {
      const response = await apiClient.get('api/console/es_config', {
        headers: {
          ...COMMON_HEADERS,
          ...credentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.host).toBeDefined();
    });
  }
);
