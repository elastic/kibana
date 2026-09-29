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

import type { findLegacyUrlAliases } from './find_legacy_url_aliases';
import type { findSharedOriginObjects } from '../utils/find_shared_origin_objects';
import type * as InternalUtils from '../utils/internal_utils';

export const mockFindLegacyUrlAliases = vi.fn() as MockedFunction<typeof findLegacyUrlAliases>;

vi.doMock('./find_legacy_url_aliases', () => {
  return { findLegacyUrlAliases: mockFindLegacyUrlAliases };
});

export const mockFindSharedOriginObjects = vi.fn() as MockedFunction<
  typeof findSharedOriginObjects
>;

vi.doMock('../utils/find_shared_origin_objects', () => {
  return { findSharedOriginObjects: mockFindSharedOriginObjects };
});

export const mockRawDocExistsInNamespace = vi.fn() as MockedFunction<
  (typeof InternalUtils)['rawDocExistsInNamespace']
>;

vi.doMock('../utils/internal_utils', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    rawDocExistsInNamespace: mockRawDocExistsInNamespace,
  };
});
