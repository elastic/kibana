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
  DATA_VIEW_PATH,
  ES_ARCHIVE_BASIC_INDEX,
  SERVICE_KEY,
} from '../../fixtures/constants';

apiTest.describe(
  `POST ${DATA_VIEW_PATH}/{id}/fields - main (data view api)`,
  { tag: tags.deploymentAgnostic },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    let createdIds: string[] = [];
    // Shared basic_index-backed data view (has real fields like 'foo') used by tests that
    // exercise attribute updates on existing fields.
    let sharedDataViewId: string;

    apiTest.beforeAll(async ({ esArchiver, requestAuth, apiClient }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
      await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);

      const createResponse = await apiClient.post(DATA_VIEW_PATH, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: { [SERVICE_KEY]: { title: 'ba*ic_index' } },
      });
      // Fail fast in setup so suite-level errors don't cascade as confusing assertion errors.
      expect(createResponse).toHaveStatusCode(200);
      sharedDataViewId = createResponse.body[SERVICE_KEY].id;
    });

    apiTest.afterEach(async ({ apiServices }) => {
      for (const id of createdIds) {
        await apiServices.dataViews.delete(id);
      }
      createdIds = [];
    });

    apiTest.afterAll(async ({ apiServices }) => {
      if (sharedDataViewId) {
        await apiServices.dataViews.delete(sharedDataViewId);
      }
    });

    apiTest('can update multiple fields', async ({ apiClient, apiServices }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const { data: dataView } = await apiServices.dataViews.create({ title, override: true });
      createdIds.push(dataView.id);

      const updateResponse = await apiClient.post(`${DATA_VIEW_PATH}/${dataView.id}/fields`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: {
          fields: {
            foo: { count: 123, customLabel: 'test' },
            bar: { count: 456, customDescription: 'desc' },
          },
        },
      });

      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body[SERVICE_KEY].fieldAttrs.foo.count).toBe(123);
      expect(updateResponse.body[SERVICE_KEY].fieldAttrs.foo.customLabel).toBe('test');
      expect(updateResponse.body[SERVICE_KEY].fieldAttrs.bar.count).toBe(456);
      expect(updateResponse.body[SERVICE_KEY].fieldAttrs.bar.customDescription).toBe('desc');

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH}/${dataView.id}`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
      });
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body[SERVICE_KEY].fieldAttrs.foo.count).toBe(123);
      expect(getResponse.body[SERVICE_KEY].fieldAttrs.bar.count).toBe(456);
    });

    apiTest(
      'can set field count attribute on non-existing field',
      async ({ apiClient, apiServices }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const { data: dataView } = await apiServices.dataViews.create({ title, override: true });
        createdIds.push(dataView.id);

        const updateResponse = await apiClient.post(`${DATA_VIEW_PATH}/${dataView.id}/fields`, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
          body: { fields: { foo: { count: 123 } } },
        });

        expect(updateResponse).toHaveStatusCode(200);
        expect(updateResponse.body[SERVICE_KEY].fieldAttrs.foo.count).toBe(123);

        const getResponse = await apiClient.get(`${DATA_VIEW_PATH}/${dataView.id}`, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
        });
        expect(getResponse.body[SERVICE_KEY].fieldAttrs.foo.count).toBe(123);
      }
    );

    apiTest('can update count attribute in attribute map', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const createResponse = await apiClient.post(DATA_VIEW_PATH, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: { [SERVICE_KEY]: { title, fieldAttrs: { foo: { count: 1 } } } },
      });
      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body[SERVICE_KEY].fieldAttrs.foo.count).toBe(1);
      const id = createResponse.body[SERVICE_KEY].id;
      createdIds.push(id);

      const updateResponse = await apiClient.post(`${DATA_VIEW_PATH}/${id}/fields`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: { fields: { foo: { count: 2 } } },
      });
      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body[SERVICE_KEY].fieldAttrs.foo.count).toBe(2);

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH}/${id}`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
      });
      expect(getResponse.body[SERVICE_KEY].fieldAttrs.foo.count).toBe(2);
    });

    apiTest('can delete count attribute from attribute map', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const createResponse = await apiClient.post(DATA_VIEW_PATH, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: { [SERVICE_KEY]: { title, fieldAttrs: { foo: { count: 1 } } } },
      });
      expect(createResponse).toHaveStatusCode(200);
      const id = createResponse.body[SERVICE_KEY].id;
      createdIds.push(id);

      const updateResponse = await apiClient.post(`${DATA_VIEW_PATH}/${id}/fields`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: { fields: { foo: { count: null } } },
      });
      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body[SERVICE_KEY].fieldAttrs.foo.count).toBeUndefined();

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH}/${id}`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
      });
      expect(getResponse.body[SERVICE_KEY].fieldAttrs.foo.count).toBeUndefined();
    });

    apiTest(
      'can set field customLabel attribute on non-existing field',
      async ({ apiClient, apiServices }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const { data: dataView } = await apiServices.dataViews.create({ title, override: true });
        createdIds.push(dataView.id);

        const updateResponse = await apiClient.post(`${DATA_VIEW_PATH}/${dataView.id}/fields`, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
          body: { fields: { foo: { customLabel: 'foo' } } },
        });
        expect(updateResponse).toHaveStatusCode(200);
        expect(updateResponse.body[SERVICE_KEY].fieldAttrs.foo.customLabel).toBe('foo');

        const getResponse = await apiClient.get(`${DATA_VIEW_PATH}/${dataView.id}`, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
        });
        expect(getResponse.body[SERVICE_KEY].fieldAttrs.foo.customLabel).toBe('foo');
      }
    );

    apiTest('can update customLabel attribute', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const createResponse = await apiClient.post(DATA_VIEW_PATH, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: { [SERVICE_KEY]: { title, fieldAttrs: { foo: { customLabel: 'foo' } } } },
      });
      expect(createResponse).toHaveStatusCode(200);
      const id = createResponse.body[SERVICE_KEY].id;
      createdIds.push(id);

      const updateResponse = await apiClient.post(`${DATA_VIEW_PATH}/${id}/fields`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: { fields: { foo: { customLabel: 'bar' } } },
      });
      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body[SERVICE_KEY].fieldAttrs.foo.customLabel).toBe('bar');

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH}/${id}`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
      });
      expect(getResponse.body[SERVICE_KEY].fieldAttrs.foo.customLabel).toBe('bar');
    });

    apiTest('can set field customLabel attribute on an existing field', async ({ apiClient }) => {
      await apiClient.post(`${DATA_VIEW_PATH}/${sharedDataViewId}/fields`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: { fields: { foo: { customLabel: 'baz' } } },
      });

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH}/${sharedDataViewId}`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body[SERVICE_KEY].fields.foo.customLabel).toBe('baz');
    });

    apiTest('can delete customLabel attribute', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const createResponse = await apiClient.post(DATA_VIEW_PATH, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: { [SERVICE_KEY]: { title, fieldAttrs: { foo: { customLabel: 'foo' } } } },
      });
      expect(createResponse).toHaveStatusCode(200);
      const id = createResponse.body[SERVICE_KEY].id;
      createdIds.push(id);

      const updateResponse = await apiClient.post(`${DATA_VIEW_PATH}/${id}/fields`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: { fields: { foo: { customLabel: null } } },
      });
      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body[SERVICE_KEY].fieldAttrs.foo.customLabel).toBeUndefined();

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH}/${id}`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
      });
      expect(getResponse.body[SERVICE_KEY].fieldAttrs.foo.customLabel).toBeUndefined();
    });

    apiTest(
      'can set field format attribute on non-existing field',
      async ({ apiClient, apiServices }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const { data: dataView } = await apiServices.dataViews.create({ title, override: true });
        createdIds.push(dataView.id);

        const updateResponse = await apiClient.post(`${DATA_VIEW_PATH}/${dataView.id}/fields`, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
          body: { fields: { foo: { format: { id: 'bar', params: { baz: 'qux' } } } } },
        });
        expect(updateResponse).toHaveStatusCode(200);
        expect(updateResponse.body[SERVICE_KEY].fieldFormats.foo).toStrictEqual({
          id: 'bar',
          params: { baz: 'qux' },
        });

        const getResponse = await apiClient.get(`${DATA_VIEW_PATH}/${dataView.id}`, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
        });
        expect(getResponse.body[SERVICE_KEY].fieldFormats.foo).toStrictEqual({
          id: 'bar',
          params: { baz: 'qux' },
        });
      }
    );

    apiTest('can update format attribute', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const createResponse = await apiClient.post(DATA_VIEW_PATH, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: {
          [SERVICE_KEY]: {
            title,
            fieldFormats: { foo: { id: 'bar', params: { baz: 'qux' } } },
          },
        },
      });
      expect(createResponse).toHaveStatusCode(200);
      const id = createResponse.body[SERVICE_KEY].id;
      createdIds.push(id);

      const updateResponse = await apiClient.post(`${DATA_VIEW_PATH}/${id}/fields`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: { fields: { foo: { format: { id: 'bar-2', params: { baz: 'qux-2' } } } } },
      });
      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body[SERVICE_KEY].fieldFormats.foo).toStrictEqual({
        id: 'bar-2',
        params: { baz: 'qux-2' },
      });

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH}/${id}`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
      });
      expect(getResponse.body[SERVICE_KEY].fieldFormats.foo).toStrictEqual({
        id: 'bar-2',
        params: { baz: 'qux-2' },
      });
    });

    apiTest('can remove format attribute', async ({ apiClient }) => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const createResponse = await apiClient.post(DATA_VIEW_PATH, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: {
          [SERVICE_KEY]: {
            title,
            fieldFormats: { foo: { id: 'bar', params: { baz: 'qux' } } },
          },
        },
      });
      expect(createResponse).toHaveStatusCode(200);
      const id = createResponse.body[SERVICE_KEY].id;
      createdIds.push(id);

      const updateResponse = await apiClient.post(`${DATA_VIEW_PATH}/${id}/fields`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: { fields: { foo: { format: null } } },
      });
      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body[SERVICE_KEY].fieldFormats.foo).toBeUndefined();

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH}/${id}`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
      });
      expect(getResponse.body[SERVICE_KEY].fieldFormats.foo).toBeUndefined();
    });
  }
);
