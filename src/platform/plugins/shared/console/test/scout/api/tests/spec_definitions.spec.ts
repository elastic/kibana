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
  'GET /api/console/api_server',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.security.complete,
      ...tags.serverless.observability.complete,
      ...tags.serverless.search,
    ],
  },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    apiTest.beforeAll(async ({ requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('viewer');
    });
    apiTest('returns autocomplete definitions', async ({ apiClient }) => {
      const { body, statusCode } = await apiClient.get('api/console/api_server', {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });
      expect(statusCode).toBe(200);
      expect(body.es).toBeDefined();
      const {
        es: { name, globals, endpoints },
      } = body;
      expect(name).toBe('es');
      expect(Object.keys(globals).length).toBeGreaterThan(0);
      expect(Object.keys(endpoints).length).toBeGreaterThan(0);
    });
  }
);
