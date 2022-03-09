/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { searchAggsSetupMock, searchAggsStartMock } from './aggs/mocks';
import { searchSourceMock } from './search_source/mocks';
import type { ISearchSetup, ISearchStart } from './types';
import { getSessionsClientMock, getSessionServiceMock } from './session/mocks';
import { createSearchUsageCollectorMock } from './collectors/mocks';

function createSetupContract(): jest.Mocked<ISearchSetup> {
  return {
    aggs: searchAggsSetupMock(),
    session: getSessionServiceMock(),
    sessionsClient: getSessionsClientMock(),
    usageCollector: createSearchUsageCollectorMock(),
  };
}

function createStartContract(): jest.Mocked<ISearchStart> {
  return {
    aggs: searchAggsStartMock(),
    search: jest.fn(),
    showError: jest.fn(),
    session: getSessionServiceMock(),
    sessionsClient: getSessionsClientMock(),
    searchSource: searchSourceMock.createStartContract(),
  };
}

export const searchServiceMock = {
  createSetupContract,
  createStartContract,
};
