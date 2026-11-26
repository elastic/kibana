/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Mock, MockedFunction } from 'vitest';
import type * as InternalUtils from '../utils/internal_utils';
import type { deleteLegacyUrlAliases } from './delete_legacy_url_aliases';

export const mockGetBulkOperationError: Mock = vi.fn() as MockedFunction<
  (typeof InternalUtils)['getBulkOperationError']
>;
export const mockGetExpectedVersionProperties: Mock = vi.fn() as MockedFunction<
  (typeof InternalUtils)['getExpectedVersionProperties']
>;
export const mockRawDocExistsInNamespace: Mock = vi.fn() as MockedFunction<
  (typeof InternalUtils)['rawDocExistsInNamespace']
>;

vi.mock('../utils/internal_utils', async () => {
  const actual = await vi.importActual('../utils/internal_utils');
  const mockedModule = {
    ...actual,
    getBulkOperationError: mockGetBulkOperationError,
    getExpectedVersionProperties: mockGetExpectedVersionProperties,
    rawDocExistsInNamespace: mockRawDocExistsInNamespace,
  };
  return { ...mockedModule, default: mockedModule };
});

export const mockDeleteLegacyUrlAliases = vi.fn() as MockedFunction<typeof deleteLegacyUrlAliases>;
vi.mock('./delete_legacy_url_aliases', () => {
  const mockedModule = {
    deleteLegacyUrlAliases: mockDeleteLegacyUrlAliases,
  };
  return { ...mockedModule, default: mockedModule };
});
