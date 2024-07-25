/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { isNotFoundFromUnsupportedServer } from '@kbn/core-elasticsearch-server-internal';
import type * as InternalUtils from '../utils/internal_utils';

export const mockGetSavedObjectFromSource = jest.fn() as jest.MockedFunction<
  (typeof InternalUtils)['getSavedObjectFromSource']
>;
export const mockRawDocExistsInNamespace = jest.fn() as jest.MockedFunction<
  (typeof InternalUtils)['rawDocExistsInNamespace']
>;

jest.mock('../utils/internal_utils', () => {
  const actual = jest.requireActual('../utils/internal_utils');
  return {
    ...actual,
    getSavedObjectFromSource: mockGetSavedObjectFromSource,
    rawDocExistsInNamespace: mockRawDocExistsInNamespace,
  };
});

export const mockIsNotFoundFromUnsupportedServer = jest.fn() as jest.MockedFunction<
  typeof isNotFoundFromUnsupportedServer
>;
jest.mock('@kbn/core-elasticsearch-server-internal', () => {
  const actual = jest.requireActual('@kbn/core-elasticsearch-server-internal');
  return {
    ...actual,
    isNotFoundFromUnsupportedServer: mockIsNotFoundFromUnsupportedServer,
  };
});
