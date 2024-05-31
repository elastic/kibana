/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FieldSpec } from '@kbn/data-views-plugin/common';
import { OptionsListRequestBody } from '../../../common/options_list/types';
import { getAllSuggestionsAggregationBuilder } from './options_list_all_suggestions';
import { getExactMatchAggregationBuilder } from './options_list_exact_match';
import { getSearchSuggestionsAggregationBuilder } from './options_list_search_suggestions';
import { getSuggestionAggregationBuilder } from './options_list_suggestion_queries';

jest.mock('./options_list_all_suggestions', () => ({
  getAllSuggestionsAggregationBuilder: jest.fn(),
}));

jest.mock('./options_list_exact_match', () => ({
  getExactMatchAggregationBuilder: jest.fn(),
}));

jest.mock('./options_list_search_suggestions', () => ({
  getSearchSuggestionsAggregationBuilder: jest.fn(),
}));

describe('options list suggestion queries', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('returns generic fetch all aggregation when no search string is provided', () => {
    const optionsListRequestBodyMock: OptionsListRequestBody = {
      size: 10,
      fieldName: '@timestamp',
      allowExpensiveQueries: true,
      sort: { by: '_key', direction: 'desc' },
      fieldSpec: { type: 'date' } as unknown as FieldSpec,
    };
    getSuggestionAggregationBuilder(optionsListRequestBodyMock);
    expect(getAllSuggestionsAggregationBuilder).toBeCalled();
    expect(getExactMatchAggregationBuilder).not.toBeCalled();
    expect(getSearchSuggestionsAggregationBuilder).not.toBeCalled();
  });

  test('returns generic exact match search query when search technique is `exact`', () => {
    const optionsListRequestBodyMock: OptionsListRequestBody = {
      size: 10,
      fieldName: 'bytes',
      allowExpensiveQueries: true,
      searchTechnique: 'exact',
      searchString: 'searchForMe',
      sort: { by: '_key', direction: 'asc' },
      fieldSpec: { type: 'number' } as unknown as FieldSpec,
    };
    getSuggestionAggregationBuilder(optionsListRequestBodyMock);
    expect(getAllSuggestionsAggregationBuilder).not.toBeCalled();
    expect(getExactMatchAggregationBuilder).toBeCalled();
    expect(getSearchSuggestionsAggregationBuilder).not.toBeCalled();
  });

  test('returns generic exact match search query when allowExpensiveQueries is `false`', () => {
    const optionsListRequestBodyMock: OptionsListRequestBody = {
      size: 10,
      fieldName: 'bytes',
      allowExpensiveQueries: false,
      searchTechnique: 'prefix',
      searchString: 'searchForMe',
      sort: { by: '_key', direction: 'asc' },
      fieldSpec: { type: 'number' } as unknown as FieldSpec,
    };
    getSuggestionAggregationBuilder(optionsListRequestBodyMock);
    expect(getAllSuggestionsAggregationBuilder).not.toBeCalled();
    expect(getExactMatchAggregationBuilder).toBeCalled();
    expect(getSearchSuggestionsAggregationBuilder).not.toBeCalled();
  });

  test('returns type-specific search query only when absolutely necessary', () => {
    const optionsListRequestBodyMock: OptionsListRequestBody = {
      size: 10,
      fieldName: 'bytes',
      allowExpensiveQueries: true,
      searchTechnique: 'prefix',
      searchString: 'searchForMe',
      sort: { by: '_key', direction: 'asc' },
      fieldSpec: { type: 'keyword' } as unknown as FieldSpec,
    };
    getSuggestionAggregationBuilder(optionsListRequestBodyMock);
    expect(getAllSuggestionsAggregationBuilder).not.toBeCalled();
    expect(getExactMatchAggregationBuilder).not.toBeCalled();
    expect(getSearchSuggestionsAggregationBuilder).toBeCalled();
  });
});
