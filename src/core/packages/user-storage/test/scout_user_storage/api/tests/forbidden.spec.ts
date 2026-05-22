/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import { createHelpers } from './helpers';

apiTest.describe(
  'User Storage - Forbidden (no user profile)',
  { tag: [...tags.stateful.classic] },
  () => {
    let apiKeyHeader: Record<string, string>;
    const h = createHelpers(() => apiKeyHeader);

    apiTest.beforeAll(async ({ requestAuth }) => {
      ({ apiKeyHeader } = await requestAuth.getApiKey('viewer'));
    });

    apiTest('GET returns 403 with API key auth', async ({ apiClient }) => {
      const response = await h.get(apiClient);
      expect(response).toHaveStatusCode(403);
    });

    apiTest('PUT returns 403 with API key auth', async ({ apiClient }) => {
      const response = await h.put(apiClient, 'test:string_key', 'value');
      expect(response).toHaveStatusCode(403);
    });

    apiTest('DELETE returns 403 with API key auth', async ({ apiClient }) => {
      const response = await h.del(apiClient, 'test:string_key');
      expect(response).toHaveStatusCode(403);
    });
  }
);
