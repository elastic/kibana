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

const FIELDS_FOR_WILDCARD_PATH = 'internal/data_views/_fields_for_wildcard';

// Internal APIs use version '1' instead of the public API version '2023-10-31'
const INTERNAL_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  [ELASTIC_HTTP_VERSION_HEADER]: '1',
};

// Expected fields from basic_index ES archive
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
  'GET /internal/data_views/_fields_for_wildcard - response',
  { tag: tags.DEPLOYMENT_AGNOSTIC },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ esArchiver, requestAuth, log }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
      log.info(`API Key created for admin role: ${adminApiCredentials.apiKey.name}`);

      await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);
      log.info(`Loaded ES archive: ${ES_ARCHIVE_BASIC_INDEX}`);
    });

    apiTest('returns a flattened version of the fields in es', async ({ apiClient }) => {
      const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?pattern=basic_index`, {
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

      // Verify fields are sorted alphabetically by name
      const sortedFields = sortBy(response.body.fields, 'name');
      expect(response.body.fields).toStrictEqual(sortedFields);
    });

    apiTest('returns a single field as requested', async ({ apiClient }) => {
      const params = new URLSearchParams();
      params.append('pattern', 'basic_index');
      params.append('fields', JSON.stringify(['bar']));

      const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?${params.toString()}`, {
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
      params.append('meta_fields', JSON.stringify(['_id', '_source', 'crazy_meta_field']));

      const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?${params.toString()}`, {
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

      // Verify fields are sorted alphabetically by name
      const sortedFields = sortBy(response.body.fields, 'name');
      expect(response.body.fields).toStrictEqual(sortedFields);
    });

    apiTest(
      'returns fields when one pattern exists and the other does not',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          `${FIELDS_FOR_WILDCARD_PATH}?pattern=bad_index,basic_index`,
          {
            headers: {
              ...INTERNAL_HEADERS,
              ...adminApiCredentials.apiKeyHeader,
            },
            responseType: 'json',
          }
        );

        expect(response.statusCode).toBe(200);
        expect(response.body).toStrictEqual({
          fields: testFields,
          indices: ['basic_index'],
        });
      }
    );

    apiTest('returns 404 when neither exists', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${FIELDS_FOR_WILDCARD_PATH}?pattern=bad_index,bad_index_2`,
        {
          headers: {
            ...INTERNAL_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        }
      );

      expect(response.statusCode).toBe(404);
    });

    apiTest('returns 404 when no patterns exist', async ({ apiClient }) => {
      const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?pattern=bad_index`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(404);
    });

    apiTest('returns nested field metadata', async ({ apiClient }) => {
      const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?pattern=basic_index`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);

      const nestedField = response.body.fields.find(
        (f: { name: string }) => f.name === 'nestedField.child'
      );
      expect(nestedField).toBeDefined();
      expect(nestedField.subType).toStrictEqual({
        nested: {
          path: 'nestedField',
        },
      });
    });

    apiTest('returns multi-field metadata', async ({ apiClient }) => {
      const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?pattern=basic_index`, {
        headers: {
          ...INTERNAL_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);

      const multiField = response.body.fields.find(
        (f: { name: string }) => f.name === 'baz.keyword'
      );
      expect(multiField).toBeDefined();
      expect(multiField.subType).toStrictEqual({
        multi: {
          parent: 'baz',
        },
      });
    });

    apiTest(
      'returns empty set when no fields even if meta fields are supplied',
      async ({ apiClient, esClient, log }) => {
        // Create an empty index
        await esClient.indices.create({ index: 'fields-for-wildcard-000001' });
        log.info('Created empty index: fields-for-wildcard-000001');

        const params = new URLSearchParams();
        params.append('pattern', 'fields-for-wildcard-000001');
        params.append('meta_fields', '_id');
        params.append('meta_fields', '_index');

        const response = await apiClient.get(`${FIELDS_FOR_WILDCARD_PATH}?${params.toString()}`, {
          headers: {
            ...INTERNAL_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(response.statusCode).toBe(200);
        expect(response.body).toStrictEqual({
          fields: [],
          indices: ['fields-for-wildcard-000001'],
        });

        // Cleanup
        await esClient.indices.delete({ index: 'fields-for-wildcard-000001' });
        log.info('Deleted index: fields-for-wildcard-000001');
      }
    );
  }
);
