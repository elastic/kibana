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

apiTest.describe('translations', { tag: tags.deploymentAgnostic }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKey('viewer');
  });

  apiTest('returns the translations with the correct headers', async ({ apiClient }) => {
    const response = await apiClient.get('/translations/en.json', {
      headers: {
        ...INTERNAL_HEADERS,
        ...credentials.apiKeyHeader,
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.locale).toBe('en');
    expect(response).toHaveHeaders({ 'content-type': 'application/json; charset=utf-8' });

    // Distributable builds serve pre-built translations with immutable caching and no etag.
    // Local dev servers return `must-revalidate` + etag instead, so we gate on CI.
    // TODO: Replace `process.env.CI` with a Scout config flag (e.g. isDistributable) when available.
    if (process.env.CI) {
      expect(response).toHaveHeaders({
        'cache-control': 'public, max-age=31536000, immutable',
      });
      expect(response.headers.etag).toBeUndefined();
    }
  });

  apiTest('returns a 404 when not using the correct locale', async ({ apiClient }) => {
    const response = await apiClient.get('/translations/foo.json', {
      headers: {
        ...INTERNAL_HEADERS,
        ...credentials.apiKeyHeader,
      },
    });

    expect(response).toHaveStatusCode(404);
  });
});
