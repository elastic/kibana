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
import {
  Plugin,
  DataPublicPluginSetup,
  DataPublicPluginStart,
  IndexPatternsContract,
  IFieldFormatsRegistry,
} from '.';
import { searchSetupMock } from './search/mocks';
import { queryServiceMock } from './query/mocks';

export type Setup = jest.Mocked<ReturnType<Plugin['setup']>>;
export type Start = jest.Mocked<ReturnType<Plugin['start']>>;

const autocompleteMock: any = {
  getValueSuggestions: jest.fn(),
  getQuerySuggestions: jest.fn(),
  hasQuerySuggestions: jest.fn(),
};

const fieldFormatsMock: IFieldFormatsRegistry = {
  getByFieldType: jest.fn(),
  getDefaultConfig: jest.fn(),
  getDefaultInstance: jest.fn() as any,
  getDefaultInstanceCacheResolver: jest.fn(),
  getDefaultInstancePlain: jest.fn(),
  getDefaultType: jest.fn(),
  getDefaultTypeName: jest.fn(),
  getInstance: jest.fn() as any,
  getType: jest.fn(),
  getTypeNameByEsTypes: jest.fn(),
  init: jest.fn(),
  register: jest.fn(),
  parseDefaultTypeMap: jest.fn(),
  deserialize: jest.fn(),
};

const createSetupContract = (): Setup => {
  const querySetupMock = queryServiceMock.createSetupContract();
  const setupContract = {
    autocomplete: autocompleteMock,
    search: searchSetupMock,
    fieldFormats: fieldFormatsMock as DataPublicPluginSetup['fieldFormats'],
    query: querySetupMock,
    __LEGACY: {
      esClient: {
        search: jest.fn(),
        msearch: jest.fn(),
      },
    },
  };

  return setupContract;
};

const createStartContract = (): Start => {
  const queryStartMock = queryServiceMock.createStartContract();
  const startContract = {
    autocomplete: autocompleteMock,
    getSuggestions: jest.fn(),
    search: {
      search: jest.fn(),

      __LEGACY: {
        esClient: {
          search: jest.fn(),
          msearch: jest.fn(),
        },
      },
    },
    fieldFormats: fieldFormatsMock as DataPublicPluginStart['fieldFormats'],
    query: queryStartMock,
    ui: {
      IndexPatternSelect: jest.fn(),
      SearchBar: jest.fn(),
    },
    __LEGACY: {
      esClient: {
        search: jest.fn(),
        msearch: jest.fn(),
      },
    },
    indexPatterns: ({
      make: () => ({
        fieldsFetcher: {
          fetchForWildcard: jest.fn(),
        },
      }),
    } as unknown) as IndexPatternsContract,
  };
  return startContract;
};

export { searchSourceMock } from './search/mocks';

export const dataPluginMock = {
  createSetupContract,
  createStartContract,
};
