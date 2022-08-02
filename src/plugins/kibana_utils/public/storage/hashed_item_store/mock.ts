/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
jest.mock('.', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    HashedItemStore: require('./hashed_item_store').HashedItemStore,
    hashedItemStore: mockHashedItemStore,
  };
});
