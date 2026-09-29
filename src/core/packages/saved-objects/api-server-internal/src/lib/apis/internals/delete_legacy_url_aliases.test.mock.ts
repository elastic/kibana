/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import type { getErrorMessage } from '@kbn/core-elasticsearch-client-server-internal';

export const mockGetEsErrorMessage = vi.fn() as MockedFunction<typeof getErrorMessage>;

vi.doMock('@kbn/core-elasticsearch-client-server-internal', () => {
  return { getErrorMessage: mockGetEsErrorMessage };
});

// Mock this function to return empty results, as this simplifies test cases and we don't need to exercise alternate code paths for these
vi.doMock('../../search', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getSearchDsl: vi.fn(),
  };
});
