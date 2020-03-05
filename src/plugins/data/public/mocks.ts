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

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { coreMock } from '../../../../src/core/public/mocks';
import { Plugin, DataPublicPluginSetup, DataPublicPluginStart, IndexPatternsContract } from '.';
import { fieldFormatsMock } from '../common/field_formats/mocks';
import { searchSetupMock } from './search/mocks';
import { queryServiceMock } from './query/mocks';
import { getCalculateAutoTimeExpression } from './search/aggs/buckets/lib/date_utils';

export type Setup = jest.Mocked<ReturnType<Plugin['setup']>>;
export type Start = jest.Mocked<ReturnType<Plugin['start']>>;

const autocompleteMock: any = {
  getValueSuggestions: jest.fn(),
  getQuerySuggestions: jest.fn(),
  hasQuerySuggestions: jest.fn(),
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
  const coreStart = coreMock.createStart();
  const queryStartMock = queryServiceMock.createStartContract();
  const startContract = {
    autocomplete: autocompleteMock,
    getSuggestions: jest.fn(),
    search: {
      aggs: {
        calculateAutoTimeExpression: getCalculateAutoTimeExpression(coreStart.uiSettings),
      },
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
      get: jest.fn().mockReturnValue(Promise.resolve({})),
    } as unknown) as IndexPatternsContract,
  };
  return startContract;
};

export { searchSourceMock } from './search/mocks';
export { getCalculateAutoTimeExpression } from './search/aggs/buckets/lib/date_utils';

export const dataPluginMock = {
  createSetupContract,
  createStartContract,
};
