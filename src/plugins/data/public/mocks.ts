/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { fieldFormatsServiceMock } from '../../field_formats/public/mocks';
import type { IndexPatternsContract } from '../common/index_patterns/index_patterns/index_patterns';
import type { AutocompleteSetup, AutocompleteStart } from './autocomplete/autocomplete_service';
import { createNowProviderMock } from './now_provider/mocks';
import { DataPublicPlugin as DataPlugin } from './plugin';
import { queryServiceMock } from './query/mocks';
import { searchServiceMock } from './search/mocks';

export type Setup = jest.Mocked<ReturnType<DataPlugin['setup']>>;
export type Start = jest.Mocked<ReturnType<DataPlugin['start']>>;

const autocompleteSetupMock: jest.Mocked<AutocompleteSetup> = {
  getQuerySuggestions: jest.fn(),
  getAutocompleteSettings: jest.fn(),
};

const autocompleteStartMock: jest.Mocked<AutocompleteStart> = {
  getValueSuggestions: jest.fn(),
  getQuerySuggestions: jest.fn(),
  hasQuerySuggestions: jest.fn(),
};

const createSetupContract = (): Setup => {
  const querySetupMock = queryServiceMock.createSetupContract();
  return {
    autocomplete: autocompleteSetupMock,
    search: searchServiceMock.createSetupContract(),
    fieldFormats: fieldFormatsServiceMock.createSetupContract(),
    query: querySetupMock,
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
      find: jest.fn((search) => [{ id: search, title: search }]),
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
    nowProvider: createNowProviderMock(),
  };
};

export { getCalculateAutoTimeExpression } from '../common/search/aggs';
export { createSearchSourceMock } from '../common/search/search_source/mocks';

export const dataPluginMock = {
  createSetupContract,
  createStartContract,
};
