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
import { COMMON_HEADERS } from '../fixtures';

// Cloud deployments can serve bundles from a CDN, so only local Kibana negotiates the encoding.
// The `br` cases need a distributable build (as CI uses): only the build step writes `.br` files.
apiTest.describe('bundle compression', { tag: ['@local-stateful-classic'] }, () => {
  let credentials: RoleApiCredentials;
  let bundlePath: string;

  apiTest.beforeAll(async ({ requestAuth, apiClient }) => {
    credentials = await requestAuth.getApiKey('viewer');
    const response = await apiClient.get('/api/status', {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
    });
    expect(response).toHaveStatusCode(200);
    const buildHash = String(response.body.version.build_hash).slice(0, 12);
    bundlePath = `/${buildHash}/bundles/kbn-ui-shared-deps-npm/kbn-ui-shared-deps-npm.dll.js`;
  });

  apiTest('returns gzip files when client only supports gzip', async ({ apiClient }) => {
    const response = await apiClient.get(bundlePath, {
      headers: { 'accept-encoding': 'gzip', ...credentials.apiKeyHeader },
      responseType: 'text',
    });

    expect(response).toHaveStatusCode(200);
    expect(response).toHaveHeaders({ 'content-encoding': 'gzip' });
  });

  apiTest('returns br files when client only supports br', async ({ apiClient }) => {
    const response = await apiClient.get(bundlePath, {
      headers: { 'accept-encoding': 'br', ...credentials.apiKeyHeader },
      responseType: 'text',
    });

    expect(response).toHaveStatusCode(200);
    expect(response).toHaveHeaders({ 'content-encoding': 'br' });
  });

  apiTest('returns br files when client only supports gzip and br', async ({ apiClient }) => {
    const response = await apiClient.get(bundlePath, {
      headers: { 'accept-encoding': 'gzip, br', ...credentials.apiKeyHeader },
      responseType: 'text',
    });

    expect(response).toHaveStatusCode(200);
    expect(response).toHaveHeaders({ 'content-encoding': 'br' });
  });

  apiTest('returns gzip files when client prefers gzip', async ({ apiClient }) => {
    const response = await apiClient.get(bundlePath, {
      headers: { 'accept-encoding': 'gzip;q=1.0, br;q=0.5', ...credentials.apiKeyHeader },
      responseType: 'text',
    });

    expect(response).toHaveStatusCode(200);
    expect(response).toHaveHeaders({ 'content-encoding': 'gzip' });
  });
});
