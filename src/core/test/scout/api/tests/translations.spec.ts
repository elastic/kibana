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
import type { RoleApiCredentials, ScoutTestConfig } from '@kbn/scout';
import { INTERNAL_HEADERS } from '../fixtures';

const isDistributable = (config: ScoutTestConfig) => Boolean(process.env.CI) || config.isCloud;

// Distributable builds serve pre-built translations with immutable caching and no etag.
// Local dev servers return `must-revalidate` + etag instead. CI covers on-merge runs against
// a built Kibana; `config.isCloud` covers deployed cloud projects, where CI is not set.
// TODO: Replace this with a Scout config flag (e.g. isDistributable) when available.
const expectedCaching = (config: ScoutTestConfig) =>
  isDistributable(config)
    ? { cacheControl: 'public, max-age=31536000, immutable', hasEtag: false }
    : { cacheControl: 'must-revalidate', hasEtag: true };

apiTest.describe('translations', { tag: tags.deploymentAgnostic }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKey('viewer');
  });

  apiTest('returns the translations with the correct headers', async ({ apiClient, config }) => {
    const response = await apiClient.get('/translations/en.json', {
      headers: {
        ...INTERNAL_HEADERS,
        ...credentials.apiKeyHeader,
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.locale).toBe('en');
    expect(response).toHaveHeaders({ 'content-type': 'application/json; charset=utf-8' });

    const { cacheControl, hasEtag } = expectedCaching(config);
    expect(response).toHaveHeaders({ 'cache-control': cacheControl });
    expect(response.headers.etag !== undefined).toBe(hasEtag);
  });

  apiTest(
    'serves a non-default locale file with the locale field intact',
    async ({ apiClient, config }) => {
      const response = await apiClient.get('/translations/fr-FR.json', {
        headers: {
          ...INTERNAL_HEADERS,
          ...credentials.apiKeyHeader,
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.locale).toBe('fr-FR');
      expect(response).toHaveHeaders({ 'content-type': 'application/json; charset=utf-8' });

      const { cacheControl, hasEtag } = expectedCaching(config);
      expect(response).toHaveHeaders({ 'cache-control': cacheControl });
      expect(response.headers.etag !== undefined).toBe(hasEtag);
    }
  );

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
