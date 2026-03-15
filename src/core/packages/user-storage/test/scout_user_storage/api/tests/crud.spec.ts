/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import { ALL_KEYS, DEFAULT_VALUES, createHelpers } from './helpers';

apiTest.describe('User Storage - CRUD', { tag: [...tags.stateful.classic] }, () => {
  let cookieHeader: Record<string, string>;
  const h = createHelpers(() => cookieHeader);

  apiTest.beforeAll(async ({ samlAuth }) => {
    ({ cookieHeader } = await samlAuth.asInteractiveUser('viewer'));
  });

  apiTest.afterAll(async ({ apiClient }) => {
    for (const key of ALL_KEYS) {
      await h.del(apiClient, key);
    }
  });

  apiTest('GET returns all registered keys with their default values', async ({ apiClient }) => {
    const response = await h.get(apiClient);
    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual(DEFAULT_VALUES);
  });

  apiTest('PUT sets a valid string value', async ({ apiClient }) => {
    expect(await h.put(apiClient, 'test:string_key', 'custom_value')).toHaveStatusCode(200);

    const response = await h.get(apiClient);
    expect(response.body['test:string_key']).toBe('custom_value');
  });

  apiTest('PUT sets a valid number value', async ({ apiClient }) => {
    expect(await h.put(apiClient, 'test:number_key', 99)).toHaveStatusCode(200);

    const response = await h.get(apiClient);
    expect(response.body['test:number_key']).toBe(99);
  });

  apiTest('PUT returns 400 for an unregistered key', async ({ apiClient }) => {
    const response = await h.put(apiClient, 'unregistered_key', 'test');
    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toContain('is not registered');
  });

  apiTest('DELETE removes an override and falls back to the default', async ({ apiClient }) => {
    await h.put(apiClient, 'test:string_key', 'overridden');

    expect(await h.del(apiClient, 'test:string_key')).toHaveStatusCode(200);

    const response = await h.get(apiClient);
    expect(response.body['test:string_key']).toBe('default_value');
  });

  apiTest('DELETE returns 400 for an unregistered key', async ({ apiClient }) => {
    const response = await h.del(apiClient, 'unregistered_key');
    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toContain('is not registered');
  });

  apiTest('PUT/GET nested object round-trips correctly', async ({ apiClient }) => {
    const value = {
      theme: 'dark',
      sidebar: { collapsed: true, width: 300 },
      pinnedItems: ['dashboard-1', 'lens-2'],
    };
    expect(await h.put(apiClient, 'test:object_key', value)).toHaveStatusCode(200);

    const response = await h.get(apiClient);
    expect(response.body['test:object_key']).toStrictEqual(value);
  });

  apiTest('PUT/GET array round-trips correctly', async ({ apiClient }) => {
    expect(await h.put(apiClient, 'test:array_key', ['a', 'b', 'c'])).toHaveStatusCode(200);

    const response = await h.get(apiClient);
    expect(response.body['test:array_key']).toStrictEqual(['a', 'b', 'c']);
  });

  apiTest('PUT/GET boolean round-trips correctly', async ({ apiClient }) => {
    expect(await h.put(apiClient, 'test:boolean_key', true)).toHaveStatusCode(200);

    const response = await h.get(apiClient);
    expect(response.body['test:boolean_key']).toBe(true);
  });

  apiTest('Multiple PUTs overwrite — last value wins', async ({ apiClient }) => {
    await h.put(apiClient, 'test:string_key', 'first');
    await h.put(apiClient, 'test:string_key', 'second');

    const response = await h.get(apiClient);
    expect(response.body['test:string_key']).toBe('second');
  });

  apiTest(
    'GET returns overrides mixed with defaults across multiple keys',
    async ({ apiClient }) => {
      await h.put(apiClient, 'test:string_key', 'custom');
      await h.put(apiClient, 'test:number_key', 100);
      await h.put(apiClient, 'test:object_key', {
        theme: 'dark',
        sidebar: { collapsed: true, width: 400 },
        pinnedItems: ['item-1'],
      });

      const response = await h.get(apiClient);
      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({
        'test:string_key': 'custom',
        'test:number_key': 100,
        'test:object_key': {
          theme: 'dark',
          sidebar: { collapsed: true, width: 400 },
          pinnedItems: ['item-1'],
        },
      });
      expect(Object.keys(response.body)).toHaveLength(ALL_KEYS.length);
    }
  );
});
