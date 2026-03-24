/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

function createStartContract(
  overrides: Partial<jest.Mocked<ISearchStart>> = {}
): jest.Mocked<ISearchStart> {
  return {
    aggs: searchAggsStartMock(),
    search: jest.fn(),
    showError: jest.fn(),
    showSearchSessionsFlyout: jest.fn(),
    showWarnings: jest.fn(),
    isBackgroundSearchEnabled: false,
    session: getSessionServiceMock(),
    sessionsClient: getSessionsClientMock(),
    searchSource: searchSourceMock.createStartContract(),
    ...overrides,
  };
}

export const searchServiceMock = {
  createSetupContract,
  createStartContract,
};
