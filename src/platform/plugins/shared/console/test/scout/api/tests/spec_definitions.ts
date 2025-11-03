/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RoleApiCredentials, apiTest, expect } from '@kbn/scout';
import { COMMON_HEADERS } from '../fixtures/constants';

apiTest.describe(
  'GET /api/console/api_server',
  { tag: ['@ess', '@svlSecurity', '@svlOblt'] },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    apiTest.beforeAll(async ({ requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
    });
    apiTest('returns autocomplete definitions', async ({ apiClient }) => {
      const { body } = await apiClient.get('api/console/api_server', {
       headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });
      expect(body.es).toBeOK();
      const {
        es: { name, globals, endpoints },
      } = body;
      expect(name).toBeOK();
      expect(Object.keys(globals).length).toBeGreaterThan(0);
      expect(Object.keys(endpoints).length).toBeGreaterThan(0);

    });
  }
);
