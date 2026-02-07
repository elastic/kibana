/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import type { IScopedSearchSessionsClient } from './types';
import type { SearchSessionsConfigSchema } from '../../config';
import type { SearchSessionRequestInfo, SearchSessionSavedObjectAttributes } from '../../../common';

export function createSearchSessionsClientMock(): jest.Mocked<IScopedSearchSessionsClient> {
  return {
    getId: jest.fn(),
    trackId: jest.fn(),
    updateStatuses: jest.fn(),
    getSearchIdMapping: jest.fn(),
    save: jest.fn(),
    get: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
    extend: jest.fn(),
    delete: jest.fn(),
    status: jest.fn(),
    getConfig: jest.fn(
      () =>
        ({
          defaultExpiration: moment.duration('1', 'w'),
          enabled: true,
        } as unknown as SearchSessionsConfigSchema)
    ),
  };
}

export function createSearchSessionSavedObjectAttributesMock(
  overrides: Partial<SearchSessionSavedObjectAttributes> = {}
) {
  return {
    sessionId: '1234',
    created: moment().toISOString(),
    expires: moment().add(7, 'days').toISOString(),
    idMapping: {},
    version: '9.2.0',
    ...overrides,
  } as SearchSessionSavedObjectAttributes;
}

export function createSearchSessionRequestInfoMock(
  overrides: Partial<SearchSessionRequestInfo> = {}
): SearchSessionRequestInfo {
  return {
    id: '1234',
    strategy: 'esql_async',
    ...overrides,
  };
}
