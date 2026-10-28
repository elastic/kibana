/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest, tags, type RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  ES_ARCHIVE_BASIC_INDEX,
  FIELDS_ROUTE_PATH,
  INTERNAL_COMMON_HEADERS,
} from '../../fixtures/constants';

apiTest.describe(
  `GET /${FIELDS_ROUTE_PATH} - cache headers`,
  { tag: tags.deploymentAgnostic },
  () => {
    let viewerApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ esArchiver, requestAuth }) => {
      // Route only reads field metadata, so `viewer` is sufficient.
      viewerApiCredentials = await requestAuth.getApiKey('viewer');
      await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);
    });

    apiTest('are present', async ({ apiClient }) => {
      const response = await apiClient.get(`${FIELDS_ROUTE_PATH}?pattern=*&include_unmapped=true`, {
        headers: {
          ...INTERNAL_COMMON_HEADERS,
          ...viewerApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const cacheControlHeader = response.headers['cache-control'];
      expect(cacheControlHeader).toContain('private');
      expect(cacheControlHeader).toContain('max-age');
      expect(cacheControlHeader).toContain('stale-while-revalidate');
      expect(response.headers.vary).toBe('accept-encoding, user-hash');
      expect(response.headers.etag).toBeDefined();
    });

    apiTest('returns 304 on matching etag', async ({ apiClient }) => {
      const url = `${FIELDS_ROUTE_PATH}?pattern=*&include_unmapped=true`;
      const firstResponse = await apiClient.get(url, {
        headers: {
          ...INTERNAL_COMMON_HEADERS,
          ...viewerApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });
      expect(firstResponse).toHaveStatusCode(200);

      const secondResponse = await apiClient.get(url, {
        headers: {
          ...INTERNAL_COMMON_HEADERS,
          ...viewerApiCredentials.apiKeyHeader,
          'If-None-Match': String(firstResponse.headers.etag),
        },
        responseType: 'json',
      });

      expect(secondResponse).toHaveStatusCode(304);
    });

    apiTest('handles empty field lists', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${FIELDS_ROUTE_PATH}?pattern=xyz&include_unmapped=true&allow_no_index=true`,
        {
          headers: {
            ...INTERNAL_COMMON_HEADERS,
            ...viewerApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.fields).toStrictEqual([]);
    });
  }
);
