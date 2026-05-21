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

const TEST_SPACE = 'test-user-storage';

apiTest.describe('User Storage - Scope Isolation', { tag: [...tags.stateful.classic] }, () => {
  let cookieHeader: Record<string, string>;
  const h = createHelpers(() => cookieHeader);

  apiTest.beforeAll(async ({ samlAuth, apiServices }) => {
    ({ cookieHeader } = await samlAuth.asInteractiveUser('viewer'));
    await apiServices.spaces.create({ id: TEST_SPACE, name: TEST_SPACE });
  });

  // Space-scoped keys use `multiple-isolated` saved objects: one ES doc per (type, profileUid)
  // that can only belong to one space at a time. `remove()` nulls out keys but leaves the SO
  // document alive, so stale documents from failed runs must be cleared before each test.
  apiTest.beforeEach(async ({ apiClient }) => {
    for (const key of ALL_KEYS) {
      await h.del(apiClient, key);
      await h.delInSpace(apiClient, TEST_SPACE, key);
    }
  });

  apiTest.afterAll(async ({ apiClient, apiServices }) => {
    for (const key of ALL_KEYS) {
      await h.del(apiClient, key);
      await h.delInSpace(apiClient, TEST_SPACE, key);
    }
    await apiServices.spaces.delete(TEST_SPACE);
  });

  apiTest(
    'space-scoped key is isolated per space — default space override not visible in second space',
    async ({ apiClient }) => {
      await h.put(apiClient, 'test:string_key', 'default-space-value');

      const response = await h.getInSpace(apiClient, TEST_SPACE);
      expect(response).toHaveStatusCode(200);
      expect(response.body['test:string_key']).toBe('default_value');
    }
  );

  apiTest(
    'global key is shared — override in default space is visible in second space',
    async ({ apiClient }) => {
      await h.put(apiClient, 'test:number_key', 999);

      const response = await h.getInSpace(apiClient, TEST_SPACE);
      expect(response).toHaveStatusCode(200);
      expect(response.body['test:number_key']).toBe(999);
    }
  );

  apiTest('global key set from another space is visible everywhere', async ({ apiClient }) => {
    await h.putInSpace(apiClient, TEST_SPACE, 'test:boolean_key', true);

    const response = await h.get(apiClient);
    expect(response).toHaveStatusCode(200);
    expect(response.body['test:boolean_key']).toBe(true);
  });
});
