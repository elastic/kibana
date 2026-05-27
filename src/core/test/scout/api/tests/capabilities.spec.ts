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
import { INTERNAL_HEADERS } from '../fixtures';

apiTest.describe('capabilities', { tag: tags.deploymentAgnostic }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKey('viewer');
  });

  apiTest('returns a 400 when an invalid app id is provided', async ({ apiClient }) => {
    const response = await apiClient.post('/api/core/capabilities', {
      headers: {
        ...INTERNAL_HEADERS,
        ...credentials.apiKeyHeader,
      },
      body: {
        applications: ['dashboard', 'discover', 'bad%app'],
      },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body).toStrictEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: '[request body.applications.2]: Invalid application id: bad%app',
    });
  });
});
