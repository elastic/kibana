/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { getErrorMessage } from '@kbn/core-elasticsearch-client-server-internal';

export const mockGetEsErrorMessage = jest.fn() as jest.MockedFunction<typeof getErrorMessage>;

jest.mock('@kbn/core-elasticsearch-client-server-internal', () => {
  return { getErrorMessage: mockGetEsErrorMessage };
});

// Mock this function to return empty results, as this simplifies test cases and we don't need to exercise alternate code paths for these
jest.mock('../../search', () => {
  const actual = jest.requireActual('../../search');
  return {
    ...actual,
    getSearchDsl: jest.fn(),
  };
});
