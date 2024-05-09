/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OptionsListRequestBody } from '../../../common/options_list/types';
import { getAllSuggestionsAggregationBuilder } from './options_list_all_suggestions';
import { getExactMatchAggregationBuilder } from './options_list_exact_match';
import { getSearchSuggestionsAggregationBuilder } from './options_list_search_suggestions';

/**
 * Suggestion aggregations
 */
export const getSuggestionAggregationBuilder = (request: OptionsListRequestBody) => {
  const { searchString, searchTechnique, allowExpensiveQueries } = request;
  const hasSearchString = searchString && searchString.length > 0;
  if (!hasSearchString) {
    // the field type only matters when there is a search string; so, if no search string,
    // return generic "fetch all" aggregation builder
    return getAllSuggestionsAggregationBuilder();
  } else if (!allowExpensiveQueries || searchTechnique === 'exact') {
    // if `allowExpensiveQueries` is false, only support exact match searching; also, field type
    // once again does not matter when building an exact match aggregation
    return getExactMatchAggregationBuilder();
  } else {
    // at this point, the type of the field matters - so, fetch the type-specific search agg
    return getSearchSuggestionsAggregationBuilder(request);
  }
};
