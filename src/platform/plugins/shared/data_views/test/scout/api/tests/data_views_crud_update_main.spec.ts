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
import { COMMON_HEADERS, configArray } from '../fixtures/constants';

configArray.forEach((config) => {
  apiTest.describe(
    `POST ${config.path}/{id} - main (${config.name})`,
    { tag: tags.DEPLOYMENT_AGNOSTIC },
    () => {
      let adminApiCredentials: RoleApiCredentials;
      let createdIds: string[] = [];

      apiTest.beforeAll(async ({ requestAuth, log }) => {
        adminApiCredentials = await requestAuth.getApiKey('admin');
        log.info(`API Key created for admin role: ${adminApiCredentials.apiKey.name}`);
      });

      apiTest.afterEach(async ({ apiClient, log }) => {
        // Clean up any data views created during the test
        for (const id of createdIds) {
          try {
            await apiClient.delete(`${config.path}/${id}`, {
              headers: {
                ...COMMON_HEADERS,
                ...adminApiCredentials.apiKeyHeader,
              },
            });
            log.info(`Cleaned up ${config.serviceKey} with id: ${id}`);
          } catch {
            log.info(`Failed to clean up ${config.serviceKey} with id: ${id}`);
          }
        }
        createdIds = [];
      });

      apiTest(`can update ${config.serviceKey} title`, async ({ apiClient }) => {
        const title1 = `foo-${Date.now()}-${Math.random()}*`;
        const title2 = `bar-${Date.now()}-${Math.random()}*`;

        // Create the data view / index pattern
        const createResponse = await apiClient.post(config.path, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [config.serviceKey]: {
              title: title1,
            },
          },
        });

        expect(createResponse.body[config.serviceKey].title).toBe(title1);
        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        // Update the title
        const updateResponse = await apiClient.post(`${config.path}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [config.serviceKey]: {
              title: title2,
            },
          },
        });

        expect(updateResponse.body[config.serviceKey].title).toBe(title2);

        // Verify the update persisted
        const getResponse = await apiClient.get(`${config.path}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(getResponse.body[config.serviceKey].title).toBe(title2);
      });

      apiTest(`can update ${config.serviceKey} name`, async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const name1 = 'good data view name';
        const name2 = 'better data view name';

        const createResponse = await apiClient.post(config.path, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [config.serviceKey]: {
              title,
              name: name1,
            },
          },
        });

        expect(createResponse.body[config.serviceKey].name).toBe(name1);
        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        const updateResponse = await apiClient.post(`${config.path}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [config.serviceKey]: {
              name: name2,
            },
          },
        });

        expect(updateResponse.body[config.serviceKey].name).toBe(name2);

        const getResponse = await apiClient.get(`${config.path}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(getResponse.body[config.serviceKey].name).toBe(name2);
      });

      apiTest(`can update ${config.serviceKey} timeFieldName`, async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;

        const createResponse = await apiClient.post(config.path, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [config.serviceKey]: {
              title,
              timeFieldName: 'timeFieldName1',
            },
          },
        });

        expect(createResponse.body[config.serviceKey].timeFieldName).toBe('timeFieldName1');
        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        const updateResponse = await apiClient.post(`${config.path}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [config.serviceKey]: {
              timeFieldName: 'timeFieldName2',
            },
          },
        });

        expect(updateResponse.body[config.serviceKey].timeFieldName).toBe('timeFieldName2');

        const getResponse = await apiClient.get(`${config.path}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(getResponse.body[config.serviceKey].timeFieldName).toBe('timeFieldName2');
      });

      apiTest(`can update ${config.serviceKey} sourceFilters`, async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;

        const createResponse = await apiClient.post(config.path, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [config.serviceKey]: {
              title,
              sourceFilters: [{ value: 'foo' }],
            },
          },
        });

        expect(createResponse.body[config.serviceKey].sourceFilters).toStrictEqual([
          { value: 'foo' },
        ]);
        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        const updateResponse = await apiClient.post(`${config.path}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [config.serviceKey]: {
              sourceFilters: [{ value: 'bar' }, { value: 'baz' }],
            },
          },
        });

        expect(updateResponse.body[config.serviceKey].sourceFilters).toStrictEqual([
          { value: 'bar' },
          { value: 'baz' },
        ]);

        const getResponse = await apiClient.get(`${config.path}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(getResponse.body[config.serviceKey].sourceFilters).toStrictEqual([
          { value: 'bar' },
          { value: 'baz' },
        ]);
      });

      apiTest(`can update ${config.serviceKey} fieldFormats`, async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;

        const createResponse = await apiClient.post(config.path, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [config.serviceKey]: {
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

        expect(createResponse.body[config.serviceKey].fieldFormats).toStrictEqual({
          foo: { id: 'foo', params: { bar: 'baz' } },
        });
        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        const updateResponse = await apiClient.post(`${config.path}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [config.serviceKey]: {
              fieldFormats: {
                a: {
                  id: 'a',
                  params: { b: 'v' },
                },
              },
            },
          },
        });

        expect(updateResponse.body[config.serviceKey].fieldFormats).toStrictEqual({
          a: { id: 'a', params: { b: 'v' } },
        });

        const getResponse = await apiClient.get(`${config.path}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(getResponse.body[config.serviceKey].fieldFormats).toStrictEqual({
          a: { id: 'a', params: { b: 'v' } },
        });
      });

      apiTest(`can update ${config.serviceKey} type`, async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;

        const createResponse = await apiClient.post(config.path, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [config.serviceKey]: {
              title,
              type: 'foo',
            },
          },
        });

        expect(createResponse.body[config.serviceKey].type).toBe('foo');
        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        const updateResponse = await apiClient.post(`${config.path}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [config.serviceKey]: {
              type: 'bar',
            },
          },
        });

        expect(updateResponse.body[config.serviceKey].type).toBe('bar');

        const getResponse = await apiClient.get(`${config.path}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(getResponse.body[config.serviceKey].type).toBe('bar');
      });

      apiTest(`can update ${config.serviceKey} typeMeta`, async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;

        const createResponse = await apiClient.post(config.path, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [config.serviceKey]: {
              title,
              typeMeta: { foo: 'bar' },
            },
          },
        });

        expect(createResponse.body[config.serviceKey].typeMeta).toStrictEqual({ foo: 'bar' });
        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        const updateResponse = await apiClient.post(`${config.path}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [config.serviceKey]: {
              typeMeta: { foo: 'baz' },
            },
          },
        });

        expect(updateResponse.body[config.serviceKey].typeMeta).toStrictEqual({ foo: 'baz' });

        const getResponse = await apiClient.get(`${config.path}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(getResponse.body[config.serviceKey].typeMeta).toStrictEqual({ foo: 'baz' });
      });

      apiTest(`can update multiple ${config.serviceKey} fields at once`, async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;

        const createResponse = await apiClient.post(config.path, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [config.serviceKey]: {
              title,
              timeFieldName: 'timeFieldName1',
              typeMeta: { foo: 'bar' },
            },
          },
        });

        expect(createResponse.body[config.serviceKey].timeFieldName).toBe('timeFieldName1');
        expect(createResponse.body[config.serviceKey].typeMeta.foo).toBe('bar');
        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        const updateResponse = await apiClient.post(`${config.path}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [config.serviceKey]: {
              timeFieldName: 'timeFieldName2',
              typeMeta: { baz: 'qux' },
            },
          },
        });

        expect(updateResponse.body[config.serviceKey].timeFieldName).toBe('timeFieldName2');
        expect(updateResponse.body[config.serviceKey].typeMeta.baz).toBe('qux');

        const getResponse = await apiClient.get(`${config.path}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(getResponse.body[config.serviceKey].timeFieldName).toBe('timeFieldName2');
        expect(getResponse.body[config.serviceKey].typeMeta.baz).toBe('qux');
      });

      apiTest(`can update ${config.serviceKey} runtime fields`, async ({ apiClient }) => {
        const title = `basic_index*`;

        const createResponse = await apiClient.post(config.path, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            override: true,
            [config.serviceKey]: {
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

        expect(createResponse.statusCode).toBe(200);
        expect(createResponse.body[config.serviceKey].title).toBe(title);
        expect(createResponse.body[config.serviceKey].runtimeFieldMap.runtimeFoo.type).toBe(
          'keyword'
        );
        expect(
          createResponse.body[config.serviceKey].runtimeFieldMap.runtimeFoo.script.source
        ).toBe('emit(doc["foo"].value)');

        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        const updateResponse = await apiClient.post(`${config.path}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            [config.serviceKey]: {
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

        expect(updateResponse.body[config.serviceKey].runtimeFieldMap.runtimeBar.type).toBe(
          'keyword'
        );
        expect(updateResponse.body[config.serviceKey].runtimeFieldMap.runtimeFoo).toBeUndefined();

        const getResponse = await apiClient.get(`${config.path}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        });

        expect(getResponse.body[config.serviceKey].runtimeFieldMap.runtimeBar.type).toBe('keyword');
        expect(getResponse.body[config.serviceKey].runtimeFieldMap.runtimeFoo).toBeUndefined();
      });
    }
  );
});
