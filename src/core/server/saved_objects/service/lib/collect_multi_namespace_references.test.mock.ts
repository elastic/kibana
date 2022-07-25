/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { findLegacyUrlAliases } from './legacy_url_aliases';
import type { findSharedOriginObjects } from './find_shared_origin_objects';
import type * as InternalUtils from './internal_utils';

export const mockFindLegacyUrlAliases = jest.fn() as jest.MockedFunction<
  typeof findLegacyUrlAliases
>;

jest.mock('./legacy_url_aliases', () => {
  return { findLegacyUrlAliases: mockFindLegacyUrlAliases };
});

export const mockFindSharedOriginObjects = jest.fn() as jest.MockedFunction<
  typeof findSharedOriginObjects
>;

jest.mock('./find_shared_origin_objects', () => {
  return { findSharedOriginObjects: mockFindSharedOriginObjects };
});

export const mockRawDocExistsInNamespace = jest.fn() as jest.MockedFunction<
  typeof InternalUtils['rawDocExistsInNamespace']
>;

jest.mock('./internal_utils', () => {
  const actual = jest.requireActual('./internal_utils');
  return {
    ...actual,
    rawDocExistsInNamespace: mockRawDocExistsInNamespace,
  };
});
