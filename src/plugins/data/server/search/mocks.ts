/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ISearchSetup, ISearchStart } from './types';
import { searchAggsSetupMock, searchAggsStartMock } from './aggs/mocks';
import { searchSourceMock } from './search_source/mocks';

export { createSearchSessionsClientMock } from './session/mocks';

export function createSearchSetupMock(): jest.Mocked<ISearchSetup> {
  return {
    aggs: searchAggsSetupMock(),
    registerSearchStrategy: jest.fn(),
    searchSource: searchSourceMock.createSetupContract(),
  };
}

export function createSearchStartMock(): jest.Mocked<ISearchStart> {
  return {
    aggs: searchAggsStartMock(),
    searchAsInternalUser: createSearchRequestHandlerContext(),
    getSearchStrategy: jest.fn(),
    asScoped: jest.fn().mockReturnValue(createSearchRequestHandlerContext()),
    searchSource: searchSourceMock.createStartContract(),
  };
}

export function createSearchRequestHandlerContext() {
  return {
    search: jest.fn(),
    cancel: jest.fn(),
    extend: jest.fn(),
    saveSession: jest.fn(),
    getSession: jest.fn(),
    findSessions: jest.fn(),
    updateSession: jest.fn(),
    extendSession: jest.fn(),
    cancelSession: jest.fn(),
    deleteSession: jest.fn(),
  };
}
