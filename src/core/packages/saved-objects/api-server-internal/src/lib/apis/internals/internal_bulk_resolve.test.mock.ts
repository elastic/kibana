/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Mock, MockedFunction } from 'vitest';
import type { isNotFoundFromUnsupportedServer } from '@kbn/core-elasticsearch-server-internal';
import type * as InternalUtils from '../utils/internal_utils';

export const mockGetSavedObjectFromSource: Mock = vi.fn() as MockedFunction<
  (typeof InternalUtils)['getSavedObjectFromSource']
>;
export const mockRawDocExistsInNamespace: Mock = vi.fn() as MockedFunction<
  (typeof InternalUtils)['rawDocExistsInNamespace']
>;

vi.mock('../utils/internal_utils', async () => {
  const actual = await vi.importActual('../utils/internal_utils');
  const mockedModule = {
    ...actual,
    getSavedObjectFromSource: mockGetSavedObjectFromSource,
    rawDocExistsInNamespace: mockRawDocExistsInNamespace,
  };
  return { ...mockedModule, default: mockedModule };
});

export const mockIsNotFoundFromUnsupportedServer: Mock = vi.fn() as MockedFunction<
  typeof isNotFoundFromUnsupportedServer
>;
vi.mock('@kbn/core-elasticsearch-server-internal', async () => {
  const actual = await vi.importActual('@kbn/core-elasticsearch-server-internal');
  const mockedModule = {
    ...actual,
    isNotFoundFromUnsupportedServer: mockIsNotFoundFromUnsupportedServer,
  };
  return { ...mockedModule, default: mockedModule };
});
