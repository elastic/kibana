/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import { StubBrowserStorage } from '@kbn/test-jest-helpers';
import { HashedItemStore } from './hashed_item_store';

/**
 * Useful for mocking state_storage from jest,
 *
 * import { mockSessionStorage } from '../state_storage/mock;
 *
 * And all tests in the test file will use HashedItemStoreSingleton
 * with underlying mockSessionStorage we have access to
 */
export const mockStorage = new StubBrowserStorage();
const mockHashedItemStore = new HashedItemStore(mockStorage);
vi.mock('.', () => ({
  HashedItemStore,
  hashedItemStore: mockHashedItemStore,
}));
