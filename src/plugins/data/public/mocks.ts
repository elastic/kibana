/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { createDatatableUtilitiesMock } from '../common/mocks';
import { DataPlugin, DataViewsContract } from '.';
import { searchServiceMock } from './search/mocks';
import { queryServiceMock } from './query/mocks';
import { AutocompleteStart, AutocompleteSetup } from './autocomplete';
import { createNowProviderMock } from './now_provider/mocks';

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
    query: querySetupMock,
  };
};

const createStartContract = (): Start => {
  const queryStartMock = queryServiceMock.createStartContract();
  const dataViews = {
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
  } as unknown as DataViewsContract;

  return {
    actions: {
      createFiltersFromValueClickAction: jest.fn().mockResolvedValue(['yes']),
      createFiltersFromRangeSelectAction: jest.fn(),
    },
    autocomplete: autocompleteStartMock,
    datatableUtilities: createDatatableUtilitiesMock(),
    search: searchServiceMock.createStartContract(),
    fieldFormats: fieldFormatsServiceMock.createStartContract(),
    query: queryStartMock,
    dataViews,
    /**
     * @deprecated Use dataViews service instead. All index pattern interfaces were renamed.
     */
    indexPatterns: dataViews,
    nowProvider: createNowProviderMock(),
  };
};

export { createSearchSourceMock } from '../common/search/search_source/mocks';
export { getCalculateAutoTimeExpression } from '../common/search/aggs';

export const dataPluginMock = {
  createSetupContract,
  createStartContract,
};
