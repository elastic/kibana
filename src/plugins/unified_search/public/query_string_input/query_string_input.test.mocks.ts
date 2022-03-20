/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { stubIndexPattern } from '../../../data/public/stubs';
import _ from 'lodash';

export const mockPersistedLog = {
  add: jest.fn(),
  get: jest.fn(() => ['response:200']),
};

export const mockPersistedLogFactory = jest.fn<jest.Mocked<typeof mockPersistedLog>, any>(() => {
  return mockPersistedLog;
});

export const mockFetchIndexPatterns = jest
  .fn()
  .mockReturnValue(Promise.resolve([stubIndexPattern]));

jest.mock('../../query/persisted_log', () => ({
  PersistedLog: mockPersistedLogFactory,
}));

jest.mock('./fetch_index_patterns', () => ({
  fetchIndexPatterns: mockFetchIndexPatterns,
}));

// Using doMock to avoid hoisting so that I can override only the debounce method in lodash
jest.doMock('lodash', () => ({
  ..._,
  debounce: (func: () => any) => func,
}));
