/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { getErrorMessage } from '../../../../elasticsearch';

export const mockGetEsErrorMessage = jest.fn() as jest.MockedFunction<typeof getErrorMessage>;

jest.mock('../../../../elasticsearch', () => {
  return { getErrorMessage: mockGetEsErrorMessage };
});

// Mock these functions to return empty results, as this simplifies test cases and we don't need to exercise alternate code paths for these
jest.mock('@kbn/es-query', () => {
  return { nodeTypes: { function: { buildNode: jest.fn() } } };
});
jest.mock('../search_dsl', () => {
  return { getSearchDsl: jest.fn() };
});
