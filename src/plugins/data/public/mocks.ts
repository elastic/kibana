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

import { Plugin, IndexPatternsContract } from '.';
import { fieldFormatsServiceMock } from './field_formats/mocks';
import { searchServiceMock } from './search/mocks';
import { queryServiceMock } from './query/mocks';
import { AutocompleteStart, AutocompleteSetup } from './autocomplete';

export type Setup = jest.Mocked<ReturnType<Plugin['setup']>>;
export type Start = jest.Mocked<ReturnType<Plugin['start']>>;

const automcompleteSetupMock: jest.Mocked<AutocompleteSetup> = {
  addQuerySuggestionProvider: jest.fn(),
  getQuerySuggestions: jest.fn(),
};

const autocompleteStartMock: jest.Mocked<AutocompleteStart> = {
  getValueSuggestions: jest.fn(),
  getQuerySuggestions: jest.fn(),
  hasQuerySuggestions: jest.fn(),
};

const createSetupContract = (): Setup => {
  const querySetupMock = queryServiceMock.createSetupContract();
  return {
    autocomplete: automcompleteSetupMock,
    search: searchServiceMock.createSetupContract(),
    fieldFormats: fieldFormatsServiceMock.createSetupContract(),
    query: querySetupMock,
    __enhance: jest.fn(),
  };
};

const createStartContract = (): Start => {
  const queryStartMock = queryServiceMock.createStartContract();
  return {
    actions: {
      createFiltersFromValueClickAction: jest.fn().mockResolvedValue(['yes']),
      createFiltersFromRangeSelectAction: jest.fn(),
    },
    autocomplete: autocompleteStartMock,
    search: searchServiceMock.createStartContract(),
    fieldFormats: fieldFormatsServiceMock.createStartContract(),
    query: queryStartMock,
    ui: {
      IndexPatternSelect: jest.fn(),
      SearchBar: jest.fn().mockReturnValue(null),
    },
    indexPatterns: ({
      createField: jest.fn(() => {}),
      createFieldList: jest.fn(() => []),
      ensureDefaultIndexPattern: jest.fn(),
      make: () => ({
        fieldsFetcher: {
          fetchForWildcard: jest.fn(),
        },
      }),
      get: jest.fn().mockReturnValue(Promise.resolve({})),
      clearCache: jest.fn(),
    } as unknown) as IndexPatternsContract,
  };
};

export { createSearchSourceMock } from './search/mocks';
export { getCalculateAutoTimeExpression } from '../common/search/aggs';

export const dataPluginMock = {
  createSetupContract,
  createStartContract,
};
