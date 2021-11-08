/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { collectMultiNamespaceReferences } from './collect_multi_namespace_references';
import type { internalBulkResolve } from './internal_bulk_resolve';
import type * as InternalUtils from './internal_utils';
import type { preflightCheckForCreate } from './preflight_check_for_create';
import type { updateObjectsSpaces } from './update_objects_spaces';
import type { deleteLegacyUrlAliases } from './legacy_url_aliases';

export const mockCollectMultiNamespaceReferences = jest.fn() as jest.MockedFunction<
  typeof collectMultiNamespaceReferences
>;

jest.mock('./collect_multi_namespace_references', () => ({
  collectMultiNamespaceReferences: mockCollectMultiNamespaceReferences,
}));

export const mockInternalBulkResolve = jest.fn() as jest.MockedFunction<typeof internalBulkResolve>;

jest.mock('./internal_bulk_resolve', () => ({
  internalBulkResolve: mockInternalBulkResolve,
}));

export const mockGetBulkOperationError = jest.fn() as jest.MockedFunction<
  typeof InternalUtils['getBulkOperationError']
>;
export const mockGetCurrentTime = jest.fn() as jest.MockedFunction<
  typeof InternalUtils['getCurrentTime']
>;

jest.mock('./internal_utils', () => {
  const actual = jest.requireActual('./internal_utils');
  return {
    ...actual,
    getBulkOperationError: mockGetBulkOperationError,
    getCurrentTime: mockGetCurrentTime,
  };
});

export const mockPreflightCheckForCreate = jest.fn() as jest.MockedFunction<
  typeof preflightCheckForCreate
>;

jest.mock('./preflight_check_for_create', () => ({
  preflightCheckForCreate: mockPreflightCheckForCreate,
}));

export const mockUpdateObjectsSpaces = jest.fn() as jest.MockedFunction<typeof updateObjectsSpaces>;

jest.mock('./update_objects_spaces', () => ({
  updateObjectsSpaces: mockUpdateObjectsSpaces,
}));

export const pointInTimeFinderMock = jest.fn();
jest.doMock('./point_in_time_finder', () => ({
  PointInTimeFinder: pointInTimeFinderMock,
}));

export const mockDeleteLegacyUrlAliases = jest.fn() as jest.MockedFunction<
  typeof deleteLegacyUrlAliases
>;
jest.mock('./legacy_url_aliases', () => ({
  deleteLegacyUrlAliases: mockDeleteLegacyUrlAliases,
}));

export const mockGetSearchDsl = jest.fn();
jest.mock('./search_dsl/search_dsl', () => ({ getSearchDsl: mockGetSearchDsl }));
