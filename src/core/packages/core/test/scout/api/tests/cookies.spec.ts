/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { expect } from '@kbn/scout/api';
import { apiTest } from '@kbn/scout';
import type { RoleApiCredentials } from '@kbn/scout';

// A proxy in front of Kibana may handle a malformed cookie before Kibana does.
apiTest.describe('cookie handling', { tag: ['@local-stateful-classic'] }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKey('viewer');
  });

  apiTest('allows non-strict cookies', async ({ apiClient }) => {
    const response = await apiClient.get('/', {
      headers: {
        cookie: 'test:80=value;test_80=value',
        ...credentials.apiKeyHeader,
      },
      responseType: 'text',
    });

    expect(response.body).not.toContain('Invalid cookie header');
  });

  apiTest('returns an error if the cookie cannot be parsed', async ({ apiClient }) => {
    const response = await apiClient.get('/', {
      headers: {
        cookie: 'a',
        ...credentials.apiKeyHeader,
      },
      responseType: 'text',
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body).toContain('Invalid cookie header');
  });
});
