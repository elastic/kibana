/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { Observable } from 'rxjs';
import { QueryService, QuerySetup, QueryStart } from '.';
import { timefilterServiceMock } from './timefilter/timefilter_service.mock';
import { createFilterManagerMock } from './filter_manager/filter_manager.mock';
import { queryStringManagerMock } from './query_string/query_string_manager.mock';

type QueryServiceClientContract = PublicMethodsOf<QueryService>;

const createSetupContractMock = () => {
  const setupContract: jest.Mocked<QuerySetup> = {
    filterManager: createFilterManagerMock(),
    timefilter: timefilterServiceMock.createSetupContract(),
    queryString: queryStringManagerMock.createSetupContract(),
    state$: new Observable(),
  };

  return setupContract;
};

const createStartContractMock = () => {
  const startContract: jest.Mocked<QueryStart> = {
    addToQueryLog: jest.fn(),
    filterManager: createFilterManagerMock(),
    queryString: queryStringManagerMock.createStartContract(),
    savedQueries: jest.fn() as any,
    state$: new Observable(),
    timefilter: timefilterServiceMock.createStartContract(),
    getEsQuery: jest.fn(),
  };

  return startContract;
};

const createMock = () => {
  const mocked: jest.Mocked<QueryServiceClientContract> = {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };

  mocked.setup.mockReturnValue(createSetupContractMock());
  mocked.start.mockReturnValue(createStartContractMock());
  return mocked;
};

export const queryServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
};
