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

const FIELDS_FOR_WILDCARD_PATH = 'internal/data_views/_fields_for_wildcard';

// Internal APIs use version '1' instead of the public API version '2023-10-31'
const INTERNAL_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  [ELASTIC_HTTP_VERSION_HEADER]: '1',
};

apiTest.describe(
  'GET /internal/data_views/_fields_for_wildcard - params',
  { tag: tags.DEPLOYMENT_AGNOSTIC },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ esArchiver, requestAuth, log }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
      log.info(`API Key created for admin role: ${adminApiCredentials.apiKey.name}`);

      await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);
      log.info(`Loaded ES archive: ${ES_ARCHIVE_BASIC_INDEX}`);
    });

    apiTest('requires a pattern query param', async ({ apiClient }) => {
      const response = await apiClient.get(FIELDS_FOR_WILDCARD_PATH, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(400);
    });

    apiTest('accepts include_unmapped param', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', '*');
      params.append('include_unmapped', 'true');

      const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?${params.toString()}`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);
    });

    apiTest('rejects unexpected query params', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', 'basic_index');
      params.append('unexpected_param', 'unexpected_value');

      const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?${params.toString()}`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(400);
    });

    // fields - accepts a JSON formatted fields query param
    apiTest('fields - accepts a JSON formatted fields query param', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', '*');
      params.append('fields', JSON.stringify(['baz']));

      const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?${params.toString()}`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);
    });

    // fields - accepts meta_fields query param in string array
    apiTest('fields - accepts fields query param in string array', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', '*');
      params.append('fields', 'baz');
      params.append('fields', 'foo');

      const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?${params.toString()}`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);
    });

    // fields - accepts single array fields query param
    apiTest('fields - accepts single array fields query param', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', '*');
      params.append('fields', 'baz');

      const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?${params.toString()}`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);
    });

    // fields - accepts single fields query param
    apiTest('fields - accepts single fields query param', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', '*');
      params.append('fields', 'baz');

      const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?${params.toString()}`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);
    });

    // fields - rejects a comma-separated list of fields
    apiTest('fields - rejects a comma-separated list of fields', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', '*');
      params.append('fields', 'foo,bar');

      const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?${params.toString()}`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(400);
    });

    // meta_fields - accepts a JSON formatted meta_fields query param
    apiTest(
      'meta_fields - accepts a JSON formatted meta_fields query param',
      async ({ apiClient }) => {
        const params = new URLSearchParams();
        params.append('pattern', '*');
        params.append('meta_fields', JSON.stringify(['meta']));

        const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?${params.toString()}`, {
          headers: {
            ...INTERNAL_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(response.statusCode).toBe(200);
      }
    );

    // meta_fields - accepts meta_fields query param in string array
    apiTest(
      'meta_fields - accepts meta_fields query param in string array',
      async ({ apiClient }) => {
        const params = new URLSearchParams();
        params.append('pattern', '*');
        params.append('meta_fields', '_id');
        params.append('meta_fields', 'meta');

        const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?${params.toString()}`, {
          headers: {
            ...INTERNAL_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(response.statusCode).toBe(200);
      }
    );

    // meta_fields - accepts single meta_fields query param
    apiTest('meta_fields - accepts single meta_fields query param', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', '*');
      params.append('meta_fields', '_id');

      const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?${params.toString()}`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);
    });

    // meta_fields - rejects a comma-separated list of meta_fields
    apiTest(
      'meta_fields - rejects a comma-separated list of meta_fields',
      async ({ apiClient }) => {
        const params = new URLSearchParams();
        params.append('pattern', '*');
        params.append('meta_fields', 'foo,bar');

        const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?${params.toString()}`, {
          headers: {
            ...INTERNAL_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(response.statusCode).toBe(400);
      }
    );
  }
);
