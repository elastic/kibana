/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Since internal_utils exports several functions, create mock functions that use the actual implementations by default.
// Individual test suites can selectively choose to mock other results if desired.

import type * as InternalUtils from '../internal_utils';

const actual = jest.requireActual<typeof InternalUtils>('../internal_utils');
const getMockFn = <T>(fn: (...args: any) => T) =>
  jest.fn().mockImplementation(fn) as jest.MockedFunction<typeof fn>; // ensures that returned values are type-safe

const mockGetBulkOperationError = getMockFn(actual.getBulkOperationError);
const mockGetExpectedVersionProperties = getMockFn(actual.getExpectedVersionProperties);
const mockGetSavedObjectFromSource = getMockFn(actual.getSavedObjectFromSource);

jest.mock('../internal_utils', () => ({
  getBulkOperationError: mockGetBulkOperationError,
  getExpectedVersionProperties: mockGetExpectedVersionProperties,
  getSavedObjectFromSource: mockGetSavedObjectFromSource,
}));

export {
  mockGetBulkOperationError,
  mockGetExpectedVersionProperties,
  mockGetSavedObjectFromSource,
};
