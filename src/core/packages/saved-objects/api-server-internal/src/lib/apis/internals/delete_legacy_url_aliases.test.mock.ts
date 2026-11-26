/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Mock, MockedFunction } from 'vitest';
import type { getErrorMessage } from '@kbn/core-elasticsearch-client-server-internal';

export const mockGetEsErrorMessage: Mock = vi.fn() as MockedFunction<typeof getErrorMessage>;

// Keep the real exports: the Elasticsearch client mocks read `PRODUCT_RESPONSE_HEADER` from this module.
vi.mock('@kbn/core-elasticsearch-client-server-internal', async () => {
  const actual = await vi.importActual('@kbn/core-elasticsearch-client-server-internal');
  const mockedModule = { ...actual, getErrorMessage: mockGetEsErrorMessage };
  return { ...mockedModule, default: mockedModule };
});

// Mock this function to return empty results, as this simplifies test cases and we don't need to exercise alternate code paths for these
vi.mock('../../search', async () => {
  const actual = await vi.importActual('../../search');
  const mockedModule = {
    ...actual,
    getSearchDsl: vi.fn(),
  };
  return { ...mockedModule, default: mockedModule };
});
