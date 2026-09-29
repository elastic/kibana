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

import type { collectMultiNamespaceReferences } from './apis/internals/collect_multi_namespace_references';
import type { internalBulkResolve } from './apis/internals/internal_bulk_resolve';
import type * as InternalUtils from './apis/utils/internal_utils';
import type { preflightCheckForCreate } from './apis/internals/preflight_check_for_create';
import type { updateObjectsSpaces } from './apis/internals/update_objects_spaces';
import type { deleteLegacyUrlAliases } from './apis/internals/delete_legacy_url_aliases';

export const mockCollectMultiNamespaceReferences = vi.fn() as MockedFunction<
  typeof collectMultiNamespaceReferences
>;

vi.doMock('./apis/internals/collect_multi_namespace_references', () => ({
  collectMultiNamespaceReferences: mockCollectMultiNamespaceReferences,
}));

export const mockInternalBulkResolve = vi.fn() as MockedFunction<typeof internalBulkResolve>;

vi.doMock('./apis/internals/internal_bulk_resolve', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  internalBulkResolve: mockInternalBulkResolve,
}));

export const mockGetBulkOperationError = vi.fn() as MockedFunction<
  (typeof InternalUtils)['getBulkOperationError']
>;
export const mockGetCurrentTime = vi.fn() as MockedFunction<
  (typeof InternalUtils)['getCurrentTime']
>;

vi.doMock('./apis/utils/internal_utils', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getBulkOperationError: mockGetBulkOperationError,
    getCurrentTime: mockGetCurrentTime,
  };
});

export const mockPreflightCheckForCreate = vi.fn() as MockedFunction<
  typeof preflightCheckForCreate
>;

vi.doMock('./apis/internals/preflight_check_for_create', () => ({
  preflightCheckForCreate: mockPreflightCheckForCreate,
}));

export const mockUpdateObjectsSpaces = vi.fn() as MockedFunction<typeof updateObjectsSpaces>;

vi.doMock('./apis/internals/update_objects_spaces', () => ({
  updateObjectsSpaces: mockUpdateObjectsSpaces,
}));

export const pointInTimeFinderMock = vi.fn();
vi.doMock('./point_in_time_finder', () => ({
  PointInTimeFinder: pointInTimeFinderMock,
}));

export const mockDeleteLegacyUrlAliases = vi.fn() as MockedFunction<typeof deleteLegacyUrlAliases>;
vi.doMock('./apis/internals/delete_legacy_url_aliases', () => ({
  deleteLegacyUrlAliases: mockDeleteLegacyUrlAliases,
}));

export const mockGetSearchDsl = vi.fn();
vi.doMock('./search/search_dsl', () => ({ getSearchDsl: mockGetSearchDsl }));
