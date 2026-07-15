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

apiTest.describe('compression', { tag: tags.deploymentAgnostic }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKey('viewer');
  });

  apiTest('uses compression when there is no referer', async ({ apiClient }) => {
    const response = await apiClient.get('/app/kibana', {
      headers: {
        'accept-encoding': 'gzip',
        ...credentials.apiKeyHeader,
      },
    });

    expect(response).toHaveHeaders({ 'content-encoding': 'gzip' });
  });

  apiTest('uses compression when there is a whitelisted referer', async ({ apiClient }) => {
    const response = await apiClient.get('/app/kibana', {
      headers: {
        'accept-encoding': 'gzip',
        referer: 'https://some-host.com',
        ...credentials.apiKeyHeader,
      },
    });

    expect(response).toHaveHeaders({ 'content-encoding': 'gzip' });
  });
});
