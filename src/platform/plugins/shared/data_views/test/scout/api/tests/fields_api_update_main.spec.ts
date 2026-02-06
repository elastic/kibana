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
import { COMMON_HEADERS, ES_ARCHIVE_BASIC_INDEX, configArray } from '../fixtures/constants';

configArray.forEach((config) => {
  apiTest.describe(
    `POST ${config.path}/{id}/fields - main (${config.name})`,
    { tag: tags.DEPLOYMENT_AGNOSTIC },
    () => {
      let adminApiCredentials: RoleApiCredentials;
      let createdIds: string[] = [];

      apiTest.beforeAll(async ({ esArchiver, requestAuth, log }) => {
        adminApiCredentials = await requestAuth.getApiKey('admin');
        log.info(`API Key created for admin role: ${adminApiCredentials.apiKey.name}`);

        await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);
        log.info(`Loaded ES archive: ${ES_ARCHIVE_BASIC_INDEX}`);
      });

      apiTest.afterEach(async ({ apiClient, log }) => {
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

      apiTest('can update multiple fields', async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const createResponse = await apiClient.post(config.path, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
          body: { [config.serviceKey]: { title } },
        });

        expect(createResponse.statusCode).toBe(200);
        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        const updateResponse = await apiClient.post(`${config.path}/${id}/fields`, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
          body: {
            fields: {
              foo: { count: 123, customLabel: 'test' },
              bar: { count: 456, customDescription: 'desc' },
            },
          },
        });

        expect(updateResponse.statusCode).toBe(200);
        expect(updateResponse.body[config.serviceKey].fieldAttrs.foo.count).toBe(123);
        expect(updateResponse.body[config.serviceKey].fieldAttrs.foo.customLabel).toBe('test');
        expect(updateResponse.body[config.serviceKey].fieldAttrs.bar.count).toBe(456);
        expect(updateResponse.body[config.serviceKey].fieldAttrs.bar.customDescription).toBe(
          'desc'
        );

        const getResponse = await apiClient.get(`${config.path}/${id}`, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
        });

        expect(getResponse.statusCode).toBe(200);
        expect(getResponse.body[config.serviceKey].fieldAttrs.foo.count).toBe(123);
        expect(getResponse.body[config.serviceKey].fieldAttrs.foo.customLabel).toBe('test');
        expect(getResponse.body[config.serviceKey].fieldAttrs.bar.count).toBe(456);
        expect(getResponse.body[config.serviceKey].fieldAttrs.bar.customDescription).toBe('desc');
      });

      apiTest('can set field count attribute on non-existing field', async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const createResponse = await apiClient.post(config.path, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
          body: { [config.serviceKey]: { title } },
        });

        expect(createResponse.statusCode).toBe(200);
        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        const updateResponse = await apiClient.post(`${config.path}/${id}/fields`, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
          body: { fields: { foo: { count: 123 } } },
        });

        expect(updateResponse.statusCode).toBe(200);
        expect(updateResponse.body[config.serviceKey].fieldAttrs.foo.count).toBe(123);

        const getResponse = await apiClient.get(`${config.path}/${id}`, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
        });

        expect(getResponse.statusCode).toBe(200);
        expect(getResponse.body[config.serviceKey].fieldAttrs.foo.count).toBe(123);
      });

      apiTest('can update count attribute in attribute map', async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const createResponse = await apiClient.post(config.path, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
          body: { [config.serviceKey]: { title, fieldAttrs: { foo: { count: 1 } } } },
        });

        expect(createResponse.statusCode).toBe(200);
        expect(createResponse.body[config.serviceKey].fieldAttrs.foo.count).toBe(1);
        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        const updateResponse = await apiClient.post(`${config.path}/${id}/fields`, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
          body: { fields: { foo: { count: 2 } } },
        });

        expect(updateResponse.statusCode).toBe(200);
        expect(updateResponse.body[config.serviceKey].fieldAttrs.foo.count).toBe(2);

        const getResponse = await apiClient.get(`${config.path}/${id}`, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
        });

        expect(getResponse.statusCode).toBe(200);
        expect(getResponse.body[config.serviceKey].fieldAttrs.foo.count).toBe(2);
      });

      apiTest('can delete count attribute from attribute map', async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const createResponse = await apiClient.post(config.path, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
          body: { [config.serviceKey]: { title, fieldAttrs: { foo: { count: 1 } } } },
        });

        expect(createResponse.statusCode).toBe(200);
        expect(createResponse.body[config.serviceKey].fieldAttrs.foo.count).toBe(1);
        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        const updateResponse = await apiClient.post(`${config.path}/${id}/fields`, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
          body: { fields: { foo: { count: null } } },
        });

        expect(updateResponse.statusCode).toBe(200);
        expect(updateResponse.body[config.serviceKey].fieldAttrs.foo.count).toBeUndefined();

        const getResponse = await apiClient.get(`${config.path}/${id}`, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
        });

        expect(getResponse.statusCode).toBe(200);
        expect(getResponse.body[config.serviceKey].fieldAttrs.foo.count).toBeUndefined();
      });

      apiTest(
        'can set field customLabel attribute on non-existing field',
        async ({ apiClient }) => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const createResponse = await apiClient.post(config.path, {
            headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
            responseType: 'json',
            body: { [config.serviceKey]: { title } },
          });

          expect(createResponse.statusCode).toBe(200);
          const id = createResponse.body[config.serviceKey].id;
          createdIds.push(id);

          const updateResponse = await apiClient.post(`${config.path}/${id}/fields`, {
            headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
            responseType: 'json',
            body: { fields: { foo: { customLabel: 'foo' } } },
          });

          expect(updateResponse.statusCode).toBe(200);
          expect(updateResponse.body[config.serviceKey].fieldAttrs.foo.customLabel).toBe('foo');

          const getResponse = await apiClient.get(`${config.path}/${id}`, {
            headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
            responseType: 'json',
          });

          expect(getResponse.statusCode).toBe(200);
          expect(getResponse.body[config.serviceKey].fieldAttrs.foo.customLabel).toBe('foo');
        }
      );

      apiTest('can update customLabel attribute', async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const createResponse = await apiClient.post(config.path, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
          body: { [config.serviceKey]: { title, fieldAttrs: { foo: { customLabel: 'foo' } } } },
        });

        expect(createResponse.statusCode).toBe(200);
        expect(createResponse.body[config.serviceKey].fieldAttrs.foo.customLabel).toBe('foo');
        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        const updateResponse = await apiClient.post(`${config.path}/${id}/fields`, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
          body: { fields: { foo: { customLabel: 'bar' } } },
        });

        expect(updateResponse.statusCode).toBe(200);
        expect(updateResponse.body[config.serviceKey].fieldAttrs.foo.customLabel).toBe('bar');

        const getResponse = await apiClient.get(`${config.path}/${id}`, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
        });

        expect(getResponse.statusCode).toBe(200);
        expect(getResponse.body[config.serviceKey].fieldAttrs.foo.customLabel).toBe('bar');
      });

      apiTest('can delete customLabel attribute', async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const createResponse = await apiClient.post(config.path, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
          body: { [config.serviceKey]: { title, fieldAttrs: { foo: { customLabel: 'foo' } } } },
        });

        expect(createResponse.statusCode).toBe(200);
        expect(createResponse.body[config.serviceKey].fieldAttrs.foo.customLabel).toBe('foo');
        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        const updateResponse = await apiClient.post(`${config.path}/${id}/fields`, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
          body: { fields: { foo: { customLabel: null } } },
        });

        expect(updateResponse.statusCode).toBe(200);
        expect(updateResponse.body[config.serviceKey].fieldAttrs.foo.customLabel).toBeUndefined();

        const getResponse = await apiClient.get(`${config.path}/${id}`, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
        });

        expect(getResponse.statusCode).toBe(200);
        expect(getResponse.body[config.serviceKey].fieldAttrs.foo.customLabel).toBeUndefined();
      });

      apiTest('can set field format attribute on non-existing field', async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const createResponse = await apiClient.post(config.path, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
          body: { [config.serviceKey]: { title } },
        });

        expect(createResponse.statusCode).toBe(200);
        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        const updateResponse = await apiClient.post(`${config.path}/${id}/fields`, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
          body: { fields: { foo: { format: { id: 'bar', params: { baz: 'qux' } } } } },
        });

        expect(updateResponse.statusCode).toBe(200);
        expect(updateResponse.body[config.serviceKey].fieldFormats.foo).toStrictEqual({
          id: 'bar',
          params: { baz: 'qux' },
        });

        const getResponse = await apiClient.get(`${config.path}/${id}`, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
        });

        expect(getResponse.statusCode).toBe(200);
        expect(getResponse.body[config.serviceKey].fieldFormats.foo).toStrictEqual({
          id: 'bar',
          params: { baz: 'qux' },
        });
      });

      apiTest('can update format attribute', async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const createResponse = await apiClient.post(config.path, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
          body: {
            [config.serviceKey]: {
              title,
              fieldFormats: { foo: { id: 'bar', params: { baz: 'qux' } } },
            },
          },
        });

        expect(createResponse.statusCode).toBe(200);
        expect(createResponse.body[config.serviceKey].fieldFormats.foo).toStrictEqual({
          id: 'bar',
          params: { baz: 'qux' },
        });
        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        const updateResponse = await apiClient.post(`${config.path}/${id}/fields`, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
          body: { fields: { foo: { format: { id: 'bar-2', params: { baz: 'qux-2' } } } } },
        });

        expect(updateResponse.statusCode).toBe(200);
        expect(updateResponse.body[config.serviceKey].fieldFormats.foo).toStrictEqual({
          id: 'bar-2',
          params: { baz: 'qux-2' },
        });

        const getResponse = await apiClient.get(`${config.path}/${id}`, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
        });

        expect(getResponse.statusCode).toBe(200);
        expect(getResponse.body[config.serviceKey].fieldFormats.foo).toStrictEqual({
          id: 'bar-2',
          params: { baz: 'qux-2' },
        });
      });

      apiTest('can remove format attribute', async ({ apiClient }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const createResponse = await apiClient.post(config.path, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
          body: {
            [config.serviceKey]: {
              title,
              fieldFormats: { foo: { id: 'bar', params: { baz: 'qux' } } },
            },
          },
        });

        expect(createResponse.statusCode).toBe(200);
        const id = createResponse.body[config.serviceKey].id;
        createdIds.push(id);

        const updateResponse = await apiClient.post(`${config.path}/${id}/fields`, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
          body: { fields: { foo: { format: null } } },
        });

        expect(updateResponse.statusCode).toBe(200);
        expect(updateResponse.body[config.serviceKey].fieldFormats.foo).toBeUndefined();

        const getResponse = await apiClient.get(`${config.path}/${id}`, {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          responseType: 'json',
        });

        expect(getResponse.statusCode).toBe(200);
        expect(getResponse.body[config.serviceKey].fieldFormats.foo).toBeUndefined();
      });
    }
  );
});
