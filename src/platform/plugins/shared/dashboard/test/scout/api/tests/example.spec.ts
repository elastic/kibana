/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest, expect, tags } from '@kbn/scout';
import { testData } from '../fixtures';

apiTest.describe('Scout API test suite example', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  let viewerApiCredentials: RoleApiCredentials;
  
  apiTest.beforeAll(async ({ requestAuth }) => {
    viewerApiCredentials = await requestAuth.getApiKey('viewer');
  });

  apiTest('should complete a basic API flow', async ({ apiClient }) => {
    const response = await apiClient.post('kibana/api', {
      headers: {
        ...viewerApiCredentials.apiKeyHeader,
        ...testData.COMMON_HEADERS,
      },
      responseType: 'json',
      body: {},
    });
    expect(response.statusCode).toBe(200);
  });
});
