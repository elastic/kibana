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
  FIELDS_FOR_WILDCARD_PATH,
  INTERNAL_COMMON_HEADERS,
} from '../../fixtures/constants';

apiTest.describe(
  `GET /${FIELDS_FOR_WILDCARD_PATH} - params`,
  { tag: tags.deploymentAgnostic },
  () => {
    let viewerApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ esArchiver, requestAuth }) => {
      // Route only reads field metadata, so `viewer` is sufficient.
      viewerApiCredentials = await requestAuth.getApiKey('viewer');
      await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);
    });

    apiTest('requires a pattern query param', async ({ apiClient }) => {
      const response = await apiClient.get(FIELDS_FOR_WILDCARD_PATH, {
        headers: {
          ...INTERNAL_COMMON_HEADERS,
          ...viewerApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
    });

    apiTest('accepts include_unmapped param', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', '*');
      params.append('include_unmapped', 'true');

      const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?${params.toString()}`, {
        headers: {
          ...INTERNAL_COMMON_HEADERS,
          ...viewerApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
    });

    apiTest('rejects unexpected query params', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', 'basic_index');
      params.append('unexpected_param', 'unexpected_value');

      const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?${params.toString()}`, {
        headers: {
          ...INTERNAL_COMMON_HEADERS,
          ...viewerApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
    });

    apiTest('fields - accepts a JSON formatted fields query param', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', '*');
      params.append('fields', JSON.stringify(['baz']));

      const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?${params.toString()}`, {
        headers: {
          ...INTERNAL_COMMON_HEADERS,
          ...viewerApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
    });

    apiTest('fields - accepts fields query param in string array', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', '*');
      params.append('fields', 'baz');
      params.append('fields', 'foo');

      const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?${params.toString()}`, {
        headers: {
          ...INTERNAL_COMMON_HEADERS,
          ...viewerApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
    });

    apiTest('fields - accepts single array fields query param', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', '*');
      params.append('fields', 'baz');

      const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?${params.toString()}`, {
        headers: {
          ...INTERNAL_COMMON_HEADERS,
          ...viewerApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
    });

    apiTest('fields - accepts single fields query param', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', '*');
      params.append('fields', 'baz');

      const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?${params.toString()}`, {
        headers: {
          ...INTERNAL_COMMON_HEADERS,
          ...viewerApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
    });

    apiTest('fields - rejects a comma-separated list of fields', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', '*');
      params.append('fields', 'foo,bar');

      const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?${params.toString()}`, {
        headers: {
          ...INTERNAL_COMMON_HEADERS,
          ...viewerApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
    });

    apiTest(
      'meta_fields - accepts a JSON formatted meta_fields query param',
      async ({ apiClient }) => {
        const params = new URLSearchParams();
        params.append('pattern', '*');
        params.append('meta_fields', JSON.stringify(['meta']));

        const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?${params.toString()}`, {
          headers: {
            ...INTERNAL_COMMON_HEADERS,
            ...viewerApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
      }
    );

    apiTest(
      'meta_fields - accepts meta_fields query param in string array',
      async ({ apiClient }) => {
        const params = new URLSearchParams();
        params.append('pattern', '*');
        params.append('meta_fields', '_id');
        params.append('meta_fields', 'meta');

        const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?${params.toString()}`, {
          headers: {
            ...INTERNAL_COMMON_HEADERS,
            ...viewerApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
      }
    );

    apiTest('meta_fields - accepts single meta_fields query param', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', '*');
      params.append('meta_fields', '_id');

      const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?${params.toString()}`, {
        headers: {
          ...INTERNAL_COMMON_HEADERS,
          ...viewerApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
    });

    apiTest(
      'meta_fields - rejects a comma-separated list of meta_fields',
      async ({ apiClient }) => {
        const params = new URLSearchParams();
        params.append('pattern', '*');
        params.append('meta_fields', 'foo,bar');

        const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?${params.toString()}`, {
          headers: {
            ...INTERNAL_COMMON_HEADERS,
            ...viewerApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(400);
      }
    );
  }
);
