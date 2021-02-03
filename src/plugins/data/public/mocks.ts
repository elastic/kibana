/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Plugin, IndexPatternsContract } from '.';
import { fieldFormatsServiceMock } from './field_formats/mocks';
import { searchServiceMock } from './search/mocks';
import { queryServiceMock } from './query/mocks';
import { AutocompleteStart, AutocompleteSetup } from './autocomplete';
import { createNowProviderMock } from './now_provider/mocks';

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

export { createSearchSourceMock } from '../common/search/search_source/mocks';
export { getCalculateAutoTimeExpression } from '../common/search/aggs';

export const dataPluginMock = {
  createSetupContract,
  createStartContract,
};
