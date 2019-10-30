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
import { Plugin } from '.';
import { searchSetupMock } from './search/mocks';
import { queryServiceMock } from './query/mocks';

export type Setup = jest.Mocked<ReturnType<Plugin['setup']>>;
export type Start = jest.Mocked<ReturnType<Plugin['start']>>;

const autocompleteMock: any = {
  addProvider: jest.fn(),
  getProvider: jest.fn(),
  clearProviders: jest.fn(),
};

const createSetupContract = (): Setup => {
  const querySetupMock = queryServiceMock.createSetupContract();
  const setupContract: Setup = {
    autocomplete: autocompleteMock as Setup['autocomplete'],
    search: searchSetupMock,
    query: querySetupMock,
  };

  return setupContract;
};

const createStartContract = (): Start => {
  const queryStartMock = queryServiceMock.createStartContract();
  const startContract: Start = {
    autocomplete: autocompleteMock as Start['autocomplete'],
    getSuggestions: jest.fn(),
    search: { search: jest.fn() },
    query: queryStartMock,
  };
  return startContract;
};

export const dataPluginMock = {
  createSetupContract,
  createStartContract,
};
