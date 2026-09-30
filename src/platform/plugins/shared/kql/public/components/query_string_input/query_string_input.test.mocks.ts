/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mocked } from 'vitest';

import { stubIndexPattern } from '@kbn/data-plugin/public/stubs';

export const mockPersistedLog = {
  add: vi.fn(),
  get: vi.fn(() => ['response:200']),
};

export const mockPersistedLogFactory = vi.fn<(...args: any) => Mocked<typeof mockPersistedLog>>(
  () => {
    return mockPersistedLog;
  }
);

export const mockFetchIndexPatterns = vi.fn().mockReturnValue(Promise.resolve([stubIndexPattern]));

vi.mock('@kbn/data-plugin/public/query/persisted_log', () => {
  const mocked = {
    PersistedLog: mockPersistedLogFactory,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./fetch_index_patterns', () => {
  const mocked = {
    fetchIndexPatterns: mockFetchIndexPatterns,
  };
  return { ...mocked, default: mocked };
});

import _ from 'lodash';
// Using doMock to avoid hoisting so that I can override only the debounce method in lodash
vi.doMock('lodash', () => {
  const mocked = {
    ..._,
    debounce: (func: any) => {
      const debounced: any = func;
      debounced.flush = vi.fn();
      debounced.cancel = vi.fn();
      return debounced;
    },
  };
  return { ...mocked, default: mocked };
});
