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
import { sortBy } from 'lodash';
import {
  ES_ARCHIVE_BASIC_INDEX,
  FIELDS_ROUTE_PATH,
  INTERNAL_COMMON_HEADERS,
} from '../../fixtures/constants';

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

apiTest.describe(`GET /${FIELDS_ROUTE_PATH} - response`, { tag: tags.deploymentAgnostic }, () => {
  let adminApiCredentials: RoleApiCredentials;
  // Tracks the temporary index created by the "returns empty set" test so cleanup runs
  // from a hook even if the test times out before reaching its inline cleanup.
  let tempIndexName: string | undefined;

  apiTest.beforeAll(async ({ esArchiver, requestAuth }) => {
    adminApiCredentials = await requestAuth.getApiKey('admin');
    await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);
  });

  apiTest.afterAll(async ({ esClient }) => {
    if (tempIndexName) {
      await esClient.indices.delete({ index: tempIndexName, ignore_unavailable: true });
      tempIndexName = undefined;
    }
  });

  apiTest('returns a flattened version of the fields in es', async ({ apiClient }) => {
    const response = await apiClient.get(`${FIELDS_ROUTE_PATH}?pattern=basic_index`, {
      headers: {
        ...INTERNAL_COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({
      fields: testFields,
      indices: ['basic_index'],
    });
    expect(response.body.fields).toStrictEqual(sortBy(response.body.fields, 'name'));
  });

  apiTest('returns a single field as requested', async ({ apiClient }) => {
    const params = new URLSearchParams();
    params.append('pattern', 'basic_index');
    params.append('fields', 'bar');

    const response = await apiClient.get(`${FIELDS_ROUTE_PATH}?${params.toString()}`, {
      headers: {
        ...INTERNAL_COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({
      fields: [testFields[0]],
      indices: ['basic_index'],
    });
  });

  apiTest('returns a single field as requested with json encoding', async ({ apiClient }) => {
    const params = new URLSearchParams();
    params.append('pattern', 'basic_index');
    params.append('fields', JSON.stringify(['bar']));

    const response = await apiClient.get(`${FIELDS_ROUTE_PATH}?${params.toString()}`, {
      headers: {
        ...INTERNAL_COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
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

    const response = await apiClient.get(`${FIELDS_ROUTE_PATH}?${params.toString()}`, {
      headers: {
        ...INTERNAL_COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);

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
    expect(response.body.fields).toStrictEqual(sortBy(response.body.fields, 'name'));
  });

  apiTest('can request fields by type', async ({ apiClient }) => {
    const params = new URLSearchParams();
    params.append('pattern', 'basic_index');
    params.append('field_types', 'boolean');

    const response = await apiClient.get(`${FIELDS_ROUTE_PATH}?${params.toString()}`, {
      headers: {
        ...INTERNAL_COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
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

    const response = await apiClient.get(`${FIELDS_ROUTE_PATH}?${params.toString()}`, {
      headers: {
        ...INTERNAL_COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({
      fields: [testFields[0], testFields[1]],
      indices: ['basic_index'],
    });
  });

  apiTest(
    'returns fields when one pattern exists and the other does not',
    async ({ apiClient }) => {
      const response = await apiClient.get(`${FIELDS_ROUTE_PATH}?pattern=bad_index,basic_index`, {
        headers: {
          ...INTERNAL_COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({
        fields: testFields,
        indices: ['basic_index'],
      });
    }
  );

  apiTest('returns 404 when neither exists', async ({ apiClient }) => {
    const response = await apiClient.get(`${FIELDS_ROUTE_PATH}?pattern=bad_index,bad_index_2`, {
      headers: {
        ...INTERNAL_COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
  });

  apiTest('returns 404 when no patterns exist', async ({ apiClient }) => {
    const response = await apiClient.get(`${FIELDS_ROUTE_PATH}?pattern=bad_index`, {
      headers: {
        ...INTERNAL_COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
  });

  apiTest(
    'returns empty set when no fields even if meta fields are supplied',
    async ({ apiClient, esClient }) => {
      // Unique per run so concurrent re-runs don't collide; cleanup happens in afterAll.
      const indexName = `fields-route-${Date.now()}`;
      tempIndexName = indexName;
      await esClient.indices.create({ index: indexName });

      const params = new URLSearchParams();
      params.append('pattern', indexName);
      params.append('meta_fields', '_id');
      params.append('meta_fields', '_index');

      const response = await apiClient.get(`${FIELDS_ROUTE_PATH}?${params.toString()}`, {
        headers: {
          ...INTERNAL_COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({
        fields: [],
        indices: [indexName],
      });
    }
  );
});
