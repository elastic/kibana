/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Mock, MockedFunction } from 'vitest';
import type { findLegacyUrlAliases } from './find_legacy_url_aliases';
import type * as InternalUtils from '../utils/internal_utils';

export const mockFindLegacyUrlAliases: Mock = vi.fn() as MockedFunction<
  typeof findLegacyUrlAliases
>;

vi.mock('./find_legacy_url_aliases', () => {
  const mockedModule = { findLegacyUrlAliases: mockFindLegacyUrlAliases };
  return { ...mockedModule, default: mockedModule };
});

export const mockRawDocExistsInNamespaces: Mock = vi.fn() as MockedFunction<
  (typeof InternalUtils)['rawDocExistsInNamespaces']
>;

vi.mock('../utils/internal_utils', async () => {
  const actual = await vi.importActual('../utils/internal_utils');
  const mockedModule = {
    ...actual,
    rawDocExistsInNamespaces: mockRawDocExistsInNamespaces,
  };
  return { ...mockedModule, default: mockedModule };
});
