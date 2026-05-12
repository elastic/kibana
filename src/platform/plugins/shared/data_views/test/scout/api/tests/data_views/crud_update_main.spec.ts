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
import { COMMON_HEADERS, DATA_VIEW_PATH, SERVICE_KEY } from '../../fixtures/constants';

apiTest.describe(
  `POST ${DATA_VIEW_PATH}/{id} - main (data view api)`,
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

    apiTest('can update data view title', async ({ apiClient }) => {
      const title1 = `foo-${Date.now()}-${Math.random()}*`;
      const title2 = `bar-${Date.now()}-${Math.random()}*`;

      const createResponse = await apiClient.post(DATA_VIEW_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY]: {
            title: title1,
          },
        },
      });

      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body[SERVICE_KEY].title).toBe(title1);
      const id = createResponse.body[SERVICE_KEY].id;
      createdIds.push(id);

      const updateResponse = await apiClient.post(`${DATA_VIEW_PATH}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY]: {
            title: title2,
          },
        },
      });

      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body[SERVICE_KEY].title).toBe(title2);

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body[SERVICE_KEY].title).toBe(title2);
    });

    apiTest('can update data view name', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const name1 = 'good data view name';
      const name2 = 'better data view name';

      const createResponse = await apiClient.post(DATA_VIEW_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY]: {
            title,
            name: name1,
          },
        },
      });

      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body[SERVICE_KEY].name).toBe(name1);
      const id = createResponse.body[SERVICE_KEY].id;
      createdIds.push(id);

      const updateResponse = await apiClient.post(`${DATA_VIEW_PATH}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY]: {
            name: name2,
          },
        },
      });

      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body[SERVICE_KEY].name).toBe(name2);

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body[SERVICE_KEY].name).toBe(name2);
    });

    apiTest('can update data view timeFieldName', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;

      const createResponse = await apiClient.post(DATA_VIEW_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY]: {
            title,
            timeFieldName: 'timeFieldName1',
          },
        },
      });

      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body[SERVICE_KEY].timeFieldName).toBe('timeFieldName1');
      const id = createResponse.body[SERVICE_KEY].id;
      createdIds.push(id);

      const updateResponse = await apiClient.post(`${DATA_VIEW_PATH}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY]: {
            timeFieldName: 'timeFieldName2',
          },
        },
      });

      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body[SERVICE_KEY].timeFieldName).toBe('timeFieldName2');

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body[SERVICE_KEY].timeFieldName).toBe('timeFieldName2');
    });

    apiTest('can update data view sourceFilters', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;

      const createResponse = await apiClient.post(DATA_VIEW_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY]: {
            title,
            sourceFilters: [{ value: 'foo' }],
          },
        },
      });

      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body[SERVICE_KEY].sourceFilters).toStrictEqual([{ value: 'foo' }]);
      const id = createResponse.body[SERVICE_KEY].id;
      createdIds.push(id);

      const updateResponse = await apiClient.post(`${DATA_VIEW_PATH}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY]: {
            sourceFilters: [{ value: 'bar' }, { value: 'baz' }],
          },
        },
      });

      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body[SERVICE_KEY].sourceFilters).toStrictEqual([
        { value: 'bar' },
        { value: 'baz' },
      ]);

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body[SERVICE_KEY].sourceFilters).toStrictEqual([
        { value: 'bar' },
        { value: 'baz' },
      ]);
    });

    apiTest('can update data view fieldFormats', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;

      const createResponse = await apiClient.post(DATA_VIEW_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY]: {
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
      expect(createResponse.body[SERVICE_KEY].fieldFormats).toStrictEqual({
        foo: { id: 'foo', params: { bar: 'baz' } },
      });
      const id = createResponse.body[SERVICE_KEY].id;
      createdIds.push(id);

      const updateResponse = await apiClient.post(`${DATA_VIEW_PATH}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY]: {
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
      expect(updateResponse.body[SERVICE_KEY].fieldFormats).toStrictEqual({
        a: { id: 'a', params: { b: 'v' } },
      });

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body[SERVICE_KEY].fieldFormats).toStrictEqual({
        a: { id: 'a', params: { b: 'v' } },
      });
    });

    apiTest('can update data view type', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;

      const createResponse = await apiClient.post(DATA_VIEW_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY]: {
            title,
            type: 'foo',
          },
        },
      });

      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body[SERVICE_KEY].type).toBe('foo');
      const id = createResponse.body[SERVICE_KEY].id;
      createdIds.push(id);

      const updateResponse = await apiClient.post(`${DATA_VIEW_PATH}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY]: {
            type: 'bar',
          },
        },
      });

      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body[SERVICE_KEY].type).toBe('bar');

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body[SERVICE_KEY].type).toBe('bar');
    });

    apiTest('can update data view typeMeta', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;

      const createResponse = await apiClient.post(DATA_VIEW_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY]: {
            title,
            typeMeta: { foo: 'bar' },
          },
        },
      });

      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body[SERVICE_KEY].typeMeta).toStrictEqual({ foo: 'bar' });
      const id = createResponse.body[SERVICE_KEY].id;
      createdIds.push(id);

      const updateResponse = await apiClient.post(`${DATA_VIEW_PATH}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY]: {
            typeMeta: { foo: 'baz' },
          },
        },
      });

      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body[SERVICE_KEY].typeMeta).toStrictEqual({ foo: 'baz' });

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body[SERVICE_KEY].typeMeta).toStrictEqual({ foo: 'baz' });
    });

    apiTest('can update multiple data view fields at once', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;

      const createResponse = await apiClient.post(DATA_VIEW_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY]: {
            title,
            timeFieldName: 'timeFieldName1',
            typeMeta: { foo: 'bar' },
          },
        },
      });

      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body[SERVICE_KEY].timeFieldName).toBe('timeFieldName1');
      expect(createResponse.body[SERVICE_KEY].typeMeta.foo).toBe('bar');
      const id = createResponse.body[SERVICE_KEY].id;
      createdIds.push(id);

      const updateResponse = await apiClient.post(`${DATA_VIEW_PATH}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY]: {
            timeFieldName: 'timeFieldName2',
            typeMeta: { baz: 'qux' },
          },
        },
      });

      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body[SERVICE_KEY].timeFieldName).toBe('timeFieldName2');
      expect(updateResponse.body[SERVICE_KEY].typeMeta.baz).toBe('qux');

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body[SERVICE_KEY].timeFieldName).toBe('timeFieldName2');
      expect(getResponse.body[SERVICE_KEY].typeMeta.baz).toBe('qux');
    });

    apiTest('can update data view runtime fields', async ({ apiClient }) => {
      const title = `basic_index*`;

      const createResponse = await apiClient.post(DATA_VIEW_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          override: true,
          [SERVICE_KEY]: {
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
      expect(createResponse.body[SERVICE_KEY].title).toBe(title);
      expect(createResponse.body[SERVICE_KEY].runtimeFieldMap.runtimeFoo.type).toBe('keyword');
      expect(createResponse.body[SERVICE_KEY].runtimeFieldMap.runtimeFoo.script.source).toBe(
        'emit(doc["foo"].value)'
      );
      const id = createResponse.body[SERVICE_KEY].id;
      createdIds.push(id);

      const updateResponse = await apiClient.post(`${DATA_VIEW_PATH}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          [SERVICE_KEY]: {
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
      expect(updateResponse.body[SERVICE_KEY].runtimeFieldMap.runtimeBar.type).toBe('keyword');
      expect(updateResponse.body[SERVICE_KEY].runtimeFieldMap.runtimeFoo).toBeUndefined();

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body[SERVICE_KEY].runtimeFieldMap.runtimeBar.type).toBe('keyword');
      expect(getResponse.body[SERVICE_KEY].runtimeFieldMap.runtimeFoo).toBeUndefined();
    });
  }
);
