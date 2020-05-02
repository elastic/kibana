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
import { ISearchStart } from './types';
import { searchSourceMock, createSearchSourceMock } from './search_source/mocks';

const searchSetupMock = {
  aggs: searchAggsSetupMock(),
  registerSearchStrategyContext: jest.fn(),
  registerSearchStrategyProvider: jest.fn(),
};

const searchStartMock: jest.Mocked<ISearchStart> = {
  aggs: searchAggsStartMock(),
  setInterceptor: jest.fn(),
  search: jest.fn(),
  searchSource: searchSourceMock,
  __LEGACY: {
    esClient: {
      search: jest.fn(),
      msearch: jest.fn(),
    },
  },
};

export { searchSetupMock, searchStartMock, createSearchSourceMock };
