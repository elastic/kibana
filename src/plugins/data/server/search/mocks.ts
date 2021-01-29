/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ISearchSetup, ISearchStart } from './types';
import { searchAggsSetupMock, searchAggsStartMock } from './aggs/mocks';
import { searchSourceMock } from './search_source/mocks';

export function createSearchSetupMock(): jest.Mocked<ISearchSetup> {
  return {
    aggs: searchAggsSetupMock(),
    registerSearchStrategy: jest.fn(),
    __enhance: jest.fn(),
  };
}

export function createSearchStartMock(): jest.Mocked<ISearchStart> {
  return {
    aggs: searchAggsStartMock(),
    getSearchStrategy: jest.fn(),
    asScoped: jest.fn().mockReturnValue({
      search: jest.fn(),
      cancel: jest.fn(),
    }),
    searchSource: searchSourceMock.createStartContract(),
  };
}
