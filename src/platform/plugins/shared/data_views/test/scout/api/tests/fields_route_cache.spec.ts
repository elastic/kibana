/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect, apiTest, tags } from '@kbn/scout';
import type { RoleApiCredentials } from '@kbn/scout';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { ES_ARCHIVE_BASIC_INDEX } from '../fixtures/constants';

// Fields route path (GET only, like fields_for_wildcard but simplified)
const FIELDS_ROUTE = 'internal/data_views/fields';

// API version for internal fields endpoint
const INITIAL_REST_VERSION_INTERNAL = '1';

// Internal APIs use a specific version header
const INTERNAL_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  [ELASTIC_HTTP_VERSION_HEADER]: '1',
};

apiTest.describe(
  'GET /internal/data_views/fields - cache headers',
  { tag: tags.DEPLOYMENT_AGNOSTIC },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ esArchiver, requestAuth, log }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
      log.info(`API Key created for admin role: ${adminApiCredentials.apiKey.name}`);

      await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);
      log.info(`Loaded ES archive: ${ES_ARCHIVE_BASIC_INDEX}`);
    });

    apiTest.afterEach(async ({ kbnClient, log }) => {
      // Reset UI settings after tests that modify them
      try {
        await kbnClient.uiSettings.replace({ 'data_views:cache_max_age': 5 });
        log.info('Reset data_views:cache_max_age to default (5)');
      } catch (e) {
        log.debug(`Failed to reset UI settings: ${(e as Error).message}`);
      }
    });

    apiTest('cache headers are present', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', '*');
      params.append('include_unmapped', 'true');
      params.append('apiVersion', INITIAL_REST_VERSION_INTERNAL);

      const response = await apiClient.get(`${FIELDS_ROUTE}?${params.toString()}`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);

      const headers = response.headers!;
      const cacheControlHeader = String(headers['cache-control']);
      expect(cacheControlHeader).toContain('private');
      expect(cacheControlHeader).toContain('max-age');
      expect(cacheControlHeader).toContain('stale-while-revalidate');
      expect(headers.vary).toBe('accept-encoding, user-hash');
      expect(headers.etag).toBeTruthy();
    });

    apiTest(
      'no-cache when data_views:cache_max_age set to zero',
      async ({ apiClient, kbnClient }) => {
        // Set cache_max_age to 0
        await kbnClient.uiSettings.update({ 'data_views:cache_max_age': 0 });

        const params = new URLSearchParams();
        params.append('pattern', 'b*');
        params.append('include_unmapped', 'true');
        params.append('apiVersion', INITIAL_REST_VERSION_INTERNAL);

        const response = await apiClient.get(`${FIELDS_ROUTE}?${params.toString()}`, {
          headers: {
            ...INTERNAL_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        const headers = response.headers!;
        const cacheControlHeader = String(headers['cache-control']);
        expect(cacheControlHeader).toContain('private');
        expect(cacheControlHeader).toContain('no-cache');
        expect(cacheControlHeader).not.toContain('max-age');
        expect(cacheControlHeader).not.toContain('stale-while-revalidate');
        expect(headers.vary).toBe('accept-encoding, user-hash');
        expect(headers.etag).toBeTruthy();
      }
    );

    apiTest('returns 304 on matching etag', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', '*');
      params.append('include_unmapped', 'true');
      params.append('apiVersion', INITIAL_REST_VERSION_INTERNAL);

      // First request to get the ETag
      const firstResponse = await apiClient.get(`${FIELDS_ROUTE}?${params.toString()}`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(firstResponse.statusCode).toBe(200);
      const firstHeaders = firstResponse.headers!;
      const etag = String(firstHeaders.etag);
      expect(etag).toBeTruthy();

      // Second request with If-None-Match header
      const secondResponse = await apiClient.get(`${FIELDS_ROUTE}?${params.toString()}`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
          'If-None-Match': etag,
        },
        responseType: 'json',
      });

      expect(secondResponse.statusCode).toBe(304);
    });

    apiTest('handles empty field lists', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', 'xyz');
      params.append('include_unmapped', 'true');
      params.append('allow_no_index', 'true');
      params.append('apiVersion', INITIAL_REST_VERSION_INTERNAL);

      const response = await apiClient.get(`${FIELDS_ROUTE}?${params.toString()}`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.body.fields).toStrictEqual([]);
    });
  }
);
