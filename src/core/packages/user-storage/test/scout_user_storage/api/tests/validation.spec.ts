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
import { ALL_KEYS, createHelpers } from './helpers';

apiTest.describe('User Storage - Schema Validation', { tag: [...tags.stateful.classic] }, () => {
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

  apiTest(
    'PUT returns 400 when value fails schema validation (string key)',
    async ({ apiClient }) => {
      const response = await h.put(apiClient, 'test:string_key', 12345);
      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest('PUT rejects invalid enum value in object key', async ({ apiClient }) => {
    const response = await h.put(apiClient, 'test:object_key', {
      theme: 'neon',
      sidebar: { collapsed: false, width: 250 },
      pinnedItems: [],
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('PUT rejects missing required field in object key', async ({ apiClient }) => {
    const response = await h.put(apiClient, 'test:object_key', {
      theme: 'light',
      pinnedItems: [],
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('PUT rejects out-of-range number in object key', async ({ apiClient }) => {
    const response = await h.put(apiClient, 'test:object_key', {
      theme: 'light',
      sidebar: { collapsed: false, width: 999 },
      pinnedItems: [],
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('PUT rejects array exceeding max length in object key', async ({ apiClient }) => {
    const response = await h.put(apiClient, 'test:object_key', {
      theme: 'dark',
      sidebar: { collapsed: true, width: 200 },
      pinnedItems: Array.from({ length: 11 }, (_, i) => `item-${i}`),
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('PUT rejects array with wrong element type', async ({ apiClient }) => {
    const response = await h.put(apiClient, 'test:array_key', [1, 2, 3]);
    expect(response).toHaveStatusCode(400);
  });

  apiTest('PUT rejects boolean key with wrong type', async ({ apiClient }) => {
    const response = await h.put(apiClient, 'test:boolean_key', 'yes');
    expect(response).toHaveStatusCode(400);
  });

  apiTest('PUT preserves empty string', async ({ apiClient }) => {
    expect(await h.put(apiClient, 'test:string_key', '')).toHaveStatusCode(200);
    const response = await h.get(apiClient);
    expect(response.body['test:string_key']).toBe('');
  });

  apiTest('PUT preserves zero', async ({ apiClient }) => {
    expect(await h.put(apiClient, 'test:number_key', 0)).toHaveStatusCode(200);
    const response = await h.get(apiClient);
    expect(response.body['test:number_key']).toBe(0);
  });

  apiTest('PUT preserves negative number', async ({ apiClient }) => {
    expect(await h.put(apiClient, 'test:number_key', -10)).toHaveStatusCode(200);
    const response = await h.get(apiClient);
    expect(response.body['test:number_key']).toBe(-10);
  });

  apiTest('PUT preserves empty array', async ({ apiClient }) => {
    expect(await h.put(apiClient, 'test:array_key', [])).toHaveStatusCode(200);
    const response = await h.get(apiClient);
    expect(response.body['test:array_key']).toStrictEqual([]);
  });

  apiTest('DELETE on a key that was never set is a no-op', async ({ apiClient }) => {
    const response = await h.del(apiClient, 'test:string_key');
    expect(response).toHaveStatusCode(200);
  });
});
