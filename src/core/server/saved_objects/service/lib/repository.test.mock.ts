/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { collectMultiNamespaceReferences } from './collect_multi_namespace_references';
import type * as InternalUtils from './internal_utils';
import type { updateObjectsSpaces } from './update_objects_spaces';

export const mockCollectMultiNamespaceReferences = jest.fn() as jest.MockedFunction<
  typeof collectMultiNamespaceReferences
>;

jest.mock('./collect_multi_namespace_references', () => ({
  collectMultiNamespaceReferences: mockCollectMultiNamespaceReferences,
}));

export const mockGetBulkOperationError = jest.fn() as jest.MockedFunction<
  typeof InternalUtils['getBulkOperationError']
>;

jest.mock('./internal_utils', () => {
  const actual = jest.requireActual('./internal_utils');
  return {
    ...actual,
    getBulkOperationError: mockGetBulkOperationError,
  };
});

export const mockUpdateObjectsSpaces = jest.fn() as jest.MockedFunction<typeof updateObjectsSpaces>;

jest.mock('./update_objects_spaces', () => ({
  updateObjectsSpaces: mockUpdateObjectsSpaces,
}));

export const pointInTimeFinderMock = jest.fn();
jest.doMock('./point_in_time_finder', () => ({
  PointInTimeFinder: pointInTimeFinderMock,
}));
