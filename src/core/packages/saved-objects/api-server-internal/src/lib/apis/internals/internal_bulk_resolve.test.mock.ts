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

import type { isNotFoundFromUnsupportedServer } from '@kbn/core-elasticsearch-server-internal';
import type * as InternalUtils from '../utils/internal_utils';

export const mockGetSavedObjectFromSource = vi.fn() as MockedFunction<
  (typeof InternalUtils)['getSavedObjectFromSource']
>;
export const mockRawDocExistsInNamespace = vi.fn() as MockedFunction<
  (typeof InternalUtils)['rawDocExistsInNamespace']
>;

vi.doMock('../utils/internal_utils', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getSavedObjectFromSource: mockGetSavedObjectFromSource,
    rawDocExistsInNamespace: mockRawDocExistsInNamespace,
  };
});

export const mockIsNotFoundFromUnsupportedServer = vi.fn() as MockedFunction<
  typeof isNotFoundFromUnsupportedServer
>;
vi.doMock('@kbn/core-elasticsearch-server-internal', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    isNotFoundFromUnsupportedServer: mockIsNotFoundFromUnsupportedServer,
  };
});
