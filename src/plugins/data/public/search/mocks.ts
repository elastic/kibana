/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { searchAggsSetupMock, searchAggsStartMock } from './aggs/mocks';
import { AggTypeFieldFilters } from './aggs/param_types/filter';
import { ISearchSetup, ISearchStart } from './types';

export * from './search_source/mocks';

export const searchSetupMock: jest.Mocked<ISearchSetup> = {
  aggs: searchAggsSetupMock(),
  registerSearchStrategyProvider: jest.fn(),
};

export const searchStartMock: jest.Mocked<ISearchStart> = {
  cancelPendingSearches: jest.fn(),
  getPendingSearchesCount$: jest.fn(() => {
    return {
      subscribe: jest.fn(),
    } as any;
  }),
  runBeyondTimeout: jest.fn(),
  aggs: searchAggsStartMock(),
  search: jest.fn(),
  __LEGACY: {
    AggConfig: jest.fn() as any,
    AggType: jest.fn(),
    aggTypeFieldFilters: new AggTypeFieldFilters(),
    FieldParamType: jest.fn(),
    MetricAggType: jest.fn(),
    parentPipelineAggHelper: jest.fn() as any,
    siblingPipelineAggHelper: jest.fn() as any,
    esClient: {
      search: jest.fn(),
      msearch: jest.fn(),
    },
  },
};
