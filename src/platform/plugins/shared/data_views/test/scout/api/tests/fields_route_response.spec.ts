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
import { sortBy } from 'lodash';
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

const testFields = [
  {
    type: 'boolean',
    esTypes: ['boolean'],
    searchable: true,
    aggregatable: true,
    name: 'bar',
    readFromDocValues: true,
    metadata_field: false,
  },
  {
    type: 'string',
    esTypes: ['text'],
    searchable: true,
    aggregatable: false,
    name: 'baz',
    readFromDocValues: false,
    metadata_field: false,
  },
  {
    type: 'string',
    esTypes: ['keyword'],
    searchable: true,
    aggregatable: true,
    name: 'baz.keyword',
    readFromDocValues: true,
    subType: { multi: { parent: 'baz' } },
    metadata_field: false,
  },
  {
    type: 'number',
    esTypes: ['long'],
    searchable: true,
    aggregatable: true,
    name: 'foo',
    readFromDocValues: true,
    metadata_field: false,
  },
  {
    aggregatable: true,
    esTypes: ['keyword'],
    name: 'nestedField.child',
    readFromDocValues: true,
    searchable: true,
    subType: {
      nested: {
        path: 'nestedField',
      },
    },
    type: 'string',
    metadata_field: false,
  },
];

apiTest.describe(
  'GET /internal/data_views/fields - response',
  { tag: tags.DEPLOYMENT_AGNOSTIC },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    let createdIndexName: string | null = null;

    apiTest.beforeAll(async ({ esArchiver, requestAuth, log }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
      log.info(`API Key created for admin role: ${adminApiCredentials.apiKey.name}`);

      await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);
      log.info(`Loaded ES archive: ${ES_ARCHIVE_BASIC_INDEX}`);
    });

    apiTest.afterEach(async ({ esClient, log }) => {
      // Cleanup any indexes created during tests
      if (createdIndexName) {
        try {
          await esClient.indices.delete({ index: createdIndexName });
          log.info(`Deleted test index: ${createdIndexName}`);
        } catch (e) {
          log.debug(`Index cleanup failed: ${(e as Error).message}`);
        }
        createdIndexName = null;
      }
    });

    apiTest('returns a flattened version of the fields in es', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', 'basic_index');
      params.append('apiVersion', INITIAL_REST_VERSION_INTERNAL);

      const response = await apiClient.get(`${FIELDS_ROUTE}?${params.toString()}`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toStrictEqual({
        fields: testFields,
        indices: ['basic_index'],
      });
      // Verify fields are sorted by name
      expect(response.body.fields).toStrictEqual(sortBy(response.body.fields, 'name'));
    });

    apiTest('returns a single field as requested', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', 'basic_index');
      params.append('fields', 'bar');
      params.append('apiVersion', INITIAL_REST_VERSION_INTERNAL);

      const response = await apiClient.get(`${FIELDS_ROUTE}?${params.toString()}`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toStrictEqual({
        fields: [testFields[0]],
        indices: ['basic_index'],
      });
    });

    apiTest('returns a single field as requested with json encoding', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', 'basic_index');
      params.append('fields', JSON.stringify(['bar']));
      params.append('apiVersion', INITIAL_REST_VERSION_INTERNAL);

      const response = await apiClient.get(`${FIELDS_ROUTE}?${params.toString()}`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toStrictEqual({
        fields: [testFields[0]],
        indices: ['basic_index'],
      });
    });

    apiTest('always returns a field for all passed meta fields', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', 'basic_index');
      params.append('meta_fields', '_id');
      params.append('meta_fields', '_source');
      params.append('meta_fields', 'crazy_meta_field');
      params.append('apiVersion', INITIAL_REST_VERSION_INTERNAL);

      const response = await apiClient.get(`${FIELDS_ROUTE}?${params.toString()}`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);

      const expectedFields = [
        {
          aggregatable: false,
          name: '_id',
          esTypes: ['_id'],
          readFromDocValues: false,
          searchable: true,
          type: 'string',
          metadata_field: true,
        },
        {
          aggregatable: false,
          name: '_source',
          esTypes: ['_source'],
          readFromDocValues: false,
          searchable: false,
          type: '_source',
          metadata_field: true,
        },
        {
          type: 'boolean',
          esTypes: ['boolean'],
          searchable: true,
          aggregatable: true,
          name: 'bar',
          readFromDocValues: true,
          metadata_field: false,
        },
        {
          aggregatable: false,
          name: 'baz',
          esTypes: ['text'],
          readFromDocValues: false,
          searchable: true,
          type: 'string',
          metadata_field: false,
        },
        {
          type: 'string',
          esTypes: ['keyword'],
          searchable: true,
          aggregatable: true,
          name: 'baz.keyword',
          readFromDocValues: true,
          subType: { multi: { parent: 'baz' } },
          metadata_field: false,
        },
        {
          aggregatable: false,
          name: 'crazy_meta_field',
          readFromDocValues: false,
          searchable: false,
          type: 'string',
          metadata_field: true,
        },
        {
          type: 'number',
          esTypes: ['long'],
          searchable: true,
          aggregatable: true,
          name: 'foo',
          readFromDocValues: true,
          metadata_field: false,
        },
        {
          aggregatable: true,
          esTypes: ['keyword'],
          name: 'nestedField.child',
          readFromDocValues: true,
          searchable: true,
          subType: {
            nested: {
              path: 'nestedField',
            },
          },
          type: 'string',
          metadata_field: false,
        },
      ];

      expect(response.body).toStrictEqual({
        fields: expectedFields,
        indices: ['basic_index'],
      });
      // Verify fields are sorted by name
      expect(response.body.fields).toStrictEqual(sortBy(response.body.fields, 'name'));
    });

    apiTest('can request fields by type', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', 'basic_index');
      params.append('field_types', 'boolean');
      params.append('apiVersion', INITIAL_REST_VERSION_INTERNAL);

      const response = await apiClient.get(`${FIELDS_ROUTE}?${params.toString()}`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toStrictEqual({
        fields: [testFields[0]],
        indices: ['basic_index'],
      });
    });

    apiTest('can request fields by multiple types', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', 'basic_index');
      params.append('field_types', 'boolean');
      params.append('field_types', 'text');
      params.append('apiVersion', INITIAL_REST_VERSION_INTERNAL);

      const response = await apiClient.get(`${FIELDS_ROUTE}?${params.toString()}`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toStrictEqual({
        fields: [testFields[0], testFields[1]],
        indices: ['basic_index'],
      });
    });

    apiTest(
      'returns fields when one pattern exists and the other does not',
      async ({ apiClient }) => {
        const params = new URLSearchParams();
        params.append('pattern', 'bad_index,basic_index');
        params.append('apiVersion', INITIAL_REST_VERSION_INTERNAL);

        const response = await apiClient.get(`${FIELDS_ROUTE}?${params.toString()}`, {
          headers: {
            ...INTERNAL_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(response.statusCode).toBe(200);
        expect(response.body).toStrictEqual({
          fields: testFields,
          indices: ['basic_index'],
        });
      }
    );

    apiTest('returns 404 when neither exists', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', 'bad_index,bad_index_2');
      params.append('apiVersion', INITIAL_REST_VERSION_INTERNAL);

      const response = await apiClient.get(`${FIELDS_ROUTE}?${params.toString()}`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(404);
    });

    apiTest('returns 404 when no patterns exist', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', 'bad_index');
      params.append('apiVersion', INITIAL_REST_VERSION_INTERNAL);

      const response = await apiClient.get(`${FIELDS_ROUTE}?${params.toString()}`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(404);
    });

    apiTest(
      'returns empty set when no fields even if meta fields are supplied',
      async ({ apiClient, esClient }) => {
        const testIndexName = `fields-route-${Date.now()}`;
        createdIndexName = testIndexName;

        await esClient.indices.create({ index: testIndexName });

        const params = new URLSearchParams();
        params.append('pattern', testIndexName);
        params.append('meta_fields', '_id');
        params.append('meta_fields', '_index');
        params.append('apiVersion', INITIAL_REST_VERSION_INTERNAL);

        const response = await apiClient.get(`${FIELDS_ROUTE}?${params.toString()}`, {
          headers: {
            ...INTERNAL_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(response.statusCode).toBe(200);
        expect(response.body).toStrictEqual({
          fields: [],
          indices: [testIndexName],
        });
      }
    );
  }
);
