/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Mock, MockedFunction } from 'vitest';
import type { collectMultiNamespaceReferences } from './apis/internals/collect_multi_namespace_references';
import type { internalBulkResolve } from './apis/internals/internal_bulk_resolve';
import type * as InternalUtils from './apis/utils/internal_utils';
import type { preflightCheckForCreate } from './apis/internals/preflight_check_for_create';
import type { updateObjectsSpaces } from './apis/internals/update_objects_spaces';
import type { deleteLegacyUrlAliases } from './apis/internals/delete_legacy_url_aliases';

export const mockCollectMultiNamespaceReferences: Mock = vi.fn() as MockedFunction<
  typeof collectMultiNamespaceReferences
>;

vi.mock('./apis/internals/collect_multi_namespace_references', () => {
  const mockedModule = {
    collectMultiNamespaceReferences: mockCollectMultiNamespaceReferences,
  };
  return { ...mockedModule, default: mockedModule };
});

export const mockInternalBulkResolve: Mock = vi.fn() as MockedFunction<typeof internalBulkResolve>;

vi.mock('./apis/internals/internal_bulk_resolve', async () => {
  const mockedModule = {
    ...(await vi.importActual('./apis/internals/internal_bulk_resolve')),
    internalBulkResolve: mockInternalBulkResolve,
  };
  return { ...mockedModule, default: mockedModule };
});

export const mockGetBulkOperationError: Mock = vi.fn() as MockedFunction<
  (typeof InternalUtils)['getBulkOperationError']
>;
export const mockGetCurrentTime: Mock = vi.fn() as MockedFunction<
  (typeof InternalUtils)['getCurrentTime']
>;

vi.mock('./apis/utils/internal_utils', async () => {
  const actual = await vi.importActual('./apis/utils/internal_utils');
  const mockedModule = {
    ...actual,
    getBulkOperationError: mockGetBulkOperationError,
    getCurrentTime: mockGetCurrentTime,
  };
  return { ...mockedModule, default: mockedModule };
});

export const mockPreflightCheckForCreate = vi.fn() as MockedFunction<
  typeof preflightCheckForCreate
>;

vi.mock('./apis/internals/preflight_check_for_create', () => {
  const mockedModule = {
    preflightCheckForCreate: mockPreflightCheckForCreate,
  };
  return { ...mockedModule, default: mockedModule };
});

export const mockUpdateObjectsSpaces: Mock = vi.fn() as MockedFunction<typeof updateObjectsSpaces>;

vi.mock('./apis/internals/update_objects_spaces', () => {
  const mockedModule = {
    updateObjectsSpaces: mockUpdateObjectsSpaces,
  };
  return { ...mockedModule, default: mockedModule };
});

export const pointInTimeFinderMock: Mock = vi.fn();
vi.doMock('./point_in_time_finder', () => {
  const mockedModule = {
    PointInTimeFinder: pointInTimeFinderMock,
  };
  return { ...mockedModule, default: mockedModule };
});

export const mockDeleteLegacyUrlAliases = vi.fn() as MockedFunction<typeof deleteLegacyUrlAliases>;
vi.mock('./apis/internals/delete_legacy_url_aliases', () => {
  const mockedModule = {
    deleteLegacyUrlAliases: mockDeleteLegacyUrlAliases,
  };
  return { ...mockedModule, default: mockedModule };
});

export const mockGetSearchDsl: Mock = vi.fn();
vi.mock('./search/search_dsl', () => {
  const mockedModule = { getSearchDsl: mockGetSearchDsl };
  return { ...mockedModule, default: mockedModule };
});
