/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OptionsListRequestBody } from '../../../common/options_list/types';
import { getAllSuggestionsAggregationBuilder } from './options_list_all_suggestions';
import { getExactMatchAggregationBuilder } from './options_list_exact_match';
import { getSearchSuggestionsAggregationBuilder } from './options_list_search_suggestions';

/**
 * Suggestion aggregations
 */
export const getSuggestionAggregationBuilder = (request: OptionsListRequestBody) => {
  const { searchString, searchTechnique } = request;
  const hasSearchString = searchString && searchString.length > 0;
  if (!hasSearchString) {
    return getAllSuggestionsAggregationBuilder();
  } else if (searchTechnique === 'exact') {
    return getExactMatchAggregationBuilder();
  } else {
    return getSearchSuggestionsAggregationBuilder(request);
  }
};
