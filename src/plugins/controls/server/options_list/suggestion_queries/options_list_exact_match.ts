/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getFieldSubtypeNested } from '@kbn/data-views-plugin/common';
import { get } from 'lodash';

import { isValidSearch } from '../../../common/options_list/is_valid_search';
import { OptionsListRequestBody, OptionsListSuggestions } from '../../../common/options_list/types';
import { EsBucket, OptionsListSuggestionAggregationBuilder } from '../types';

/**
 * Search for an exact match based on the provided search string.
 * This query will be more-or-less the same for **all** field types, and it should only ever return
 * 0 (if no match) or 1 (if a match was found) results.
 */
export const getExactMatchAggregationBuilder: () => OptionsListSuggestionAggregationBuilder = () =>
  exactMatchAggregationBuilder;

const exactMatchAggregationBuilder: OptionsListSuggestionAggregationBuilder = {
  buildAggregation: ({ fieldName, fieldSpec, searchString }: OptionsListRequestBody) => {
    if (!isValidSearch({ searchString, fieldType: fieldSpec?.type, searchTechnique: 'exact' })) {
      return {};
    }

    const suggestionsAgg = {
      suggestions: {
        filter: {
          term: {
            [fieldName]: {
              value: searchString,
              case_insensitive: fieldSpec?.type === 'string',
            },
          },
        },
        aggs: {
          filteredSuggestions: {
            terms: {
              field: fieldName,
              shard_size: 10,
            },
          },
        },
      },
    };

    const subTypeNested = fieldSpec && getFieldSubtypeNested(fieldSpec);
    if (subTypeNested) {
      return {
        nestedSuggestions: {
          nested: {
            path: subTypeNested.nested.path,
          },
          aggs: {
            ...suggestionsAgg,
          },
        },
      };
    }

    return suggestionsAgg;
  },
  parse: (rawEsResult, { searchString, fieldSpec }) => {
    if (!isValidSearch({ searchString, fieldType: fieldSpec?.type, searchTechnique: 'exact' })) {
      // if this is happens, that means there is an invalid search that snuck through to the server side code;
      // so, might as well early return with no suggestions
      return { suggestions: [], totalCardinality: 0 };
    }

    const subTypeNested = fieldSpec && getFieldSubtypeNested(fieldSpec);

    const suggestions = get(
      rawEsResult,
      `aggregations.${
        subTypeNested ? 'nestedSuggestions.suggestions' : 'suggestions'
      }.filteredSuggestions.buckets`
    )?.reduce((acc: OptionsListSuggestions, suggestion: EsBucket) => {
      acc.push({ value: suggestion.key, docCount: suggestion.doc_count });
      return acc;
    }, []);

    return {
      suggestions,
      totalCardinality: suggestions.length, // should only be 0 or 1, so it's safe to use length here
    };
  },
};
