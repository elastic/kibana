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
import { COMMON_HEADERS } from '../fixtures';

const SERVERLESS_TAGS = [
  ...tags.serverless.search,
  ...tags.serverless.observability.complete,
  ...tags.serverless.security.complete,
  ...tags.serverless.workplaceai,
];

const BLOCKED_APIS: Array<{ path: string; method: 'get' | 'post' | 'put' | 'delete' }> = [
  { path: '/api/saved_objects/_bulk_create', method: 'post' },
  { path: '/api/saved_objects/_bulk_delete', method: 'post' },
  { path: '/api/saved_objects/_bulk_get', method: 'post' },
  { path: '/api/saved_objects/_bulk_resolve', method: 'post' },
  { path: '/api/saved_objects/_bulk_update', method: 'post' },
  { path: '/api/saved_objects/test/id', method: 'get' },
  { path: '/api/saved_objects/test/id', method: 'post' },
  { path: '/api/saved_objects/test/id', method: 'delete' },
  { path: '/api/saved_objects/_find', method: 'get' },
  { path: '/api/saved_objects/test/id', method: 'put' },
];

apiTest.describe('blocked internal saved objects API', { tag: SERVERLESS_TAGS }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKey('viewer');
  });

  for (const { path, method } of BLOCKED_APIS) {
    apiTest(`${method} ${path} returns 400`, async ({ apiClient }) => {
      const response = await apiClient[method](path, {
        headers: {
          ...COMMON_HEADERS,
          ...credentials.apiKeyHeader,
        },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body).toStrictEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: `uri [${path}] with method [${method}] exists but is not available with the current configuration`,
      });
    });
  }
});
