/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as InternalUtils from './internal_utils';
import type { deleteLegacyUrlAliases } from './legacy_url_aliases';

export const mockGetBulkOperationError = jest.fn() as jest.MockedFunction<
  typeof InternalUtils['getBulkOperationError']
>;
export const mockGetExpectedVersionProperties = jest.fn() as jest.MockedFunction<
  typeof InternalUtils['getExpectedVersionProperties']
>;
export const mockRawDocExistsInNamespace = jest.fn() as jest.MockedFunction<
  typeof InternalUtils['rawDocExistsInNamespace']
>;

jest.mock('./internal_utils', () => {
  const actual = jest.requireActual('./internal_utils');
  return {
    ...actual,
    getBulkOperationError: mockGetBulkOperationError,
    getExpectedVersionProperties: mockGetExpectedVersionProperties,
    rawDocExistsInNamespace: mockRawDocExistsInNamespace,
  };
});

export const mockDeleteLegacyUrlAliases = jest.fn() as jest.MockedFunction<
  typeof deleteLegacyUrlAliases
>;
jest.mock('./legacy_url_aliases', () => ({
  deleteLegacyUrlAliases: mockDeleteLegacyUrlAliases,
}));
