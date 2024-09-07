/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { findLegacyUrlAliases } from './find_legacy_url_aliases';
import type * as InternalUtils from '../utils/internal_utils';

export const mockFindLegacyUrlAliases = jest.fn() as jest.MockedFunction<
  typeof findLegacyUrlAliases
>;

jest.mock('./find_legacy_url_aliases', () => {
  return { findLegacyUrlAliases: mockFindLegacyUrlAliases };
});

export const mockRawDocExistsInNamespaces = jest.fn() as jest.MockedFunction<
  (typeof InternalUtils)['rawDocExistsInNamespaces']
>;

jest.mock('../utils/internal_utils', () => {
  const actual = jest.requireActual('../utils/internal_utils');
  return {
    ...actual,
    rawDocExistsInNamespaces: mockRawDocExistsInNamespaces,
  };
});
