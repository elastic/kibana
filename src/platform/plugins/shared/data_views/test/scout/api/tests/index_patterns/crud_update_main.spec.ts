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
  COMMON_HEADERS,
  DATA_VIEW_PATH_LEGACY,
  SERVICE_KEY_LEGACY,
} from '../../fixtures/constants';

apiTest.describe(
  `POST ${DATA_VIEW_PATH_LEGACY}/{id} - main (legacy index pattern api)`,
  { tag: tags.deploymentAgnostic },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    let createdIds: string[] = [];

    apiTest.beforeAll(async ({ requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
    });

    apiTest.afterEach(async ({ apiServices }) => {
      for (const id of createdIds) {
        await apiServices.dataViews.delete(id);
      }
      createdIds = [];
    });

    apiTest('can update index pattern title', async ({ apiClient }) => {
      const title1 = `foo-${Date.now()}-${Math.random()}*`;
      const title2 = `bar-${Date.now()}-${Math.random()}*`;

      const createResponse = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY_LEGACY]: {
            title: title1,
          },
        },
      });

      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body[SERVICE_KEY_LEGACY].title).toBe(title1);
      const id = createResponse.body[SERVICE_KEY_LEGACY].id;
      createdIds.push(id);

      const updateResponse = await apiClient.post(`${DATA_VIEW_PATH_LEGACY}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY_LEGACY]: {
            title: title2,
          },
        },
      });

      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body[SERVICE_KEY_LEGACY].title).toBe(title2);

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH_LEGACY}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body[SERVICE_KEY_LEGACY].title).toBe(title2);
    });

    apiTest('can update index pattern name', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const name1 = 'good index pattern name';
      const name2 = 'better index pattern name';

      const createResponse = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY_LEGACY]: {
            title,
            name: name1,
          },
        },
      });

      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body[SERVICE_KEY_LEGACY].name).toBe(name1);
      const id = createResponse.body[SERVICE_KEY_LEGACY].id;
      createdIds.push(id);

      const updateResponse = await apiClient.post(`${DATA_VIEW_PATH_LEGACY}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY_LEGACY]: {
            name: name2,
          },
        },
      });

      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body[SERVICE_KEY_LEGACY].name).toBe(name2);

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH_LEGACY}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body[SERVICE_KEY_LEGACY].name).toBe(name2);
    });

    apiTest('can update index pattern timeFieldName', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;

      const createResponse = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY_LEGACY]: {
            title,
            timeFieldName: 'timeFieldName1',
          },
        },
      });

      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body[SERVICE_KEY_LEGACY].timeFieldName).toBe('timeFieldName1');
      const id = createResponse.body[SERVICE_KEY_LEGACY].id;
      createdIds.push(id);

      const updateResponse = await apiClient.post(`${DATA_VIEW_PATH_LEGACY}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY_LEGACY]: {
            timeFieldName: 'timeFieldName2',
          },
        },
      });

      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body[SERVICE_KEY_LEGACY].timeFieldName).toBe('timeFieldName2');

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH_LEGACY}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body[SERVICE_KEY_LEGACY].timeFieldName).toBe('timeFieldName2');
    });

    apiTest('can update index pattern sourceFilters', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;

      const createResponse = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY_LEGACY]: {
            title,
            sourceFilters: [{ value: 'foo' }],
          },
        },
      });

      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body[SERVICE_KEY_LEGACY].sourceFilters).toStrictEqual([
        { value: 'foo' },
      ]);
      const id = createResponse.body[SERVICE_KEY_LEGACY].id;
      createdIds.push(id);

      const updateResponse = await apiClient.post(`${DATA_VIEW_PATH_LEGACY}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY_LEGACY]: {
            sourceFilters: [{ value: 'bar' }, { value: 'baz' }],
          },
        },
      });

      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body[SERVICE_KEY_LEGACY].sourceFilters).toStrictEqual([
        { value: 'bar' },
        { value: 'baz' },
      ]);

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH_LEGACY}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body[SERVICE_KEY_LEGACY].sourceFilters).toStrictEqual([
        { value: 'bar' },
        { value: 'baz' },
      ]);
    });

    apiTest('can update index pattern fieldFormats', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;

      const createResponse = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY_LEGACY]: {
            title,
            fieldFormats: {
              foo: {
                id: 'foo',
                params: { bar: 'baz' },
              },
            },
          },
        },
      });

      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body[SERVICE_KEY_LEGACY].fieldFormats).toStrictEqual({
        foo: { id: 'foo', params: { bar: 'baz' } },
      });
      const id = createResponse.body[SERVICE_KEY_LEGACY].id;
      createdIds.push(id);

      const updateResponse = await apiClient.post(`${DATA_VIEW_PATH_LEGACY}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY_LEGACY]: {
            fieldFormats: {
              a: {
                id: 'a',
                params: { b: 'v' },
              },
            },
          },
        },
      });

      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body[SERVICE_KEY_LEGACY].fieldFormats).toStrictEqual({
        a: { id: 'a', params: { b: 'v' } },
      });

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH_LEGACY}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body[SERVICE_KEY_LEGACY].fieldFormats).toStrictEqual({
        a: { id: 'a', params: { b: 'v' } },
      });
    });

    apiTest('can update index pattern type', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;

      const createResponse = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY_LEGACY]: {
            title,
            type: 'foo',
          },
        },
      });

      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body[SERVICE_KEY_LEGACY].type).toBe('foo');
      const id = createResponse.body[SERVICE_KEY_LEGACY].id;
      createdIds.push(id);

      const updateResponse = await apiClient.post(`${DATA_VIEW_PATH_LEGACY}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY_LEGACY]: {
            type: 'bar',
          },
        },
      });

      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body[SERVICE_KEY_LEGACY].type).toBe('bar');

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH_LEGACY}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body[SERVICE_KEY_LEGACY].type).toBe('bar');
    });

    apiTest('can update index pattern typeMeta', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;

      const createResponse = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY_LEGACY]: {
            title,
            typeMeta: { foo: 'bar' },
          },
        },
      });

      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body[SERVICE_KEY_LEGACY].typeMeta).toStrictEqual({ foo: 'bar' });
      const id = createResponse.body[SERVICE_KEY_LEGACY].id;
      createdIds.push(id);

      const updateResponse = await apiClient.post(`${DATA_VIEW_PATH_LEGACY}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY_LEGACY]: {
            typeMeta: { foo: 'baz' },
          },
        },
      });

      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body[SERVICE_KEY_LEGACY].typeMeta).toStrictEqual({ foo: 'baz' });

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH_LEGACY}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body[SERVICE_KEY_LEGACY].typeMeta).toStrictEqual({ foo: 'baz' });
    });

    apiTest('can update multiple index pattern fields at once', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;

      const createResponse = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY_LEGACY]: {
            title,
            timeFieldName: 'timeFieldName1',
            typeMeta: { foo: 'bar' },
          },
        },
      });

      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body[SERVICE_KEY_LEGACY].timeFieldName).toBe('timeFieldName1');
      expect(createResponse.body[SERVICE_KEY_LEGACY].typeMeta.foo).toBe('bar');
      const id = createResponse.body[SERVICE_KEY_LEGACY].id;
      createdIds.push(id);

      const updateResponse = await apiClient.post(`${DATA_VIEW_PATH_LEGACY}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY_LEGACY]: {
            timeFieldName: 'timeFieldName2',
            typeMeta: { baz: 'qux' },
          },
        },
      });

      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body[SERVICE_KEY_LEGACY].timeFieldName).toBe('timeFieldName2');
      expect(updateResponse.body[SERVICE_KEY_LEGACY].typeMeta.baz).toBe('qux');

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH_LEGACY}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body[SERVICE_KEY_LEGACY].timeFieldName).toBe('timeFieldName2');
      expect(getResponse.body[SERVICE_KEY_LEGACY].typeMeta.baz).toBe('qux');
    });

    apiTest('can update index pattern runtime fields', async ({ apiClient }) => {
      const title = `basic_index*`;

      const createResponse = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          override: true,
          [SERVICE_KEY_LEGACY]: {
            title,
            runtimeFieldMap: {
              runtimeFoo: {
                type: 'keyword',
                script: {
                  source: 'emit(doc["foo"].value)',
                },
              },
            },
          },
        },
      });

      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body[SERVICE_KEY_LEGACY].title).toBe(title);
      expect(createResponse.body[SERVICE_KEY_LEGACY].runtimeFieldMap.runtimeFoo.type).toBe(
        'keyword'
      );
      expect(createResponse.body[SERVICE_KEY_LEGACY].runtimeFieldMap.runtimeFoo.script.source).toBe(
        'emit(doc["foo"].value)'
      );
      const id = createResponse.body[SERVICE_KEY_LEGACY].id;
      createdIds.push(id);

      const updateResponse = await apiClient.post(`${DATA_VIEW_PATH_LEGACY}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY_LEGACY]: {
            runtimeFieldMap: {
              runtimeBar: {
                type: 'keyword',
                script: {
                  source: 'emit(doc["foo"].value)',
                },
              },
            },
          },
        },
      });

      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body[SERVICE_KEY_LEGACY].runtimeFieldMap.runtimeBar.type).toBe(
        'keyword'
      );
      expect(updateResponse.body[SERVICE_KEY_LEGACY].runtimeFieldMap.runtimeFoo).toBeUndefined();

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH_LEGACY}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body[SERVICE_KEY_LEGACY].runtimeFieldMap.runtimeBar.type).toBe('keyword');
      expect(getResponse.body[SERVICE_KEY_LEGACY].runtimeFieldMap.runtimeFoo).toBeUndefined();
    });
  }
);
