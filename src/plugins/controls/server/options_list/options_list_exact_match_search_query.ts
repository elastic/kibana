/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getFieldSubtypeNested } from '@kbn/data-views-plugin/common';
import { get } from 'lodash';

import { isValidSearch } from '../../common/options_list/suggestions_searching';
import { OptionsListRequestBody, OptionsListSuggestions } from '../../common/options_list/types';
import { EsBucket, OptionsListSuggestionAggregationBuilder } from './types';

export const exactMatchSearchAggregation: OptionsListSuggestionAggregationBuilder = {
  buildAggregation: ({ fieldName, fieldSpec, searchString }: OptionsListRequestBody) => {
    if (
      !searchString ||
      searchString.length === 0 ||
      !isValidSearch({
        searchString,
        fieldType: fieldSpec?.type,
        searchTechnique: 'exact',
      })
    ) {
      // this must be called with a search string, and that search string must be valid
      return undefined;
    }

    const suggestionsAgg = {
      suggestions: {
        filter: {
          term: {
            [fieldName]: {
              value: searchString,
              case_insensitive: fieldSpec?.type !== 'number' && fieldSpec?.type !== 'ip',
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
  parse: (rawEsResult, request) => {
    if (!rawEsResult) {
      // if rawEsResult is undefined, then the request either (a) was missing a search string or
      // (b) an invalid search request accidentally got through from the client side to the server
      // side. Either way, return an empty result
      return { suggestions: [], totalCardinality: 0 };
    }
    const subTypeNested = request.fieldSpec && getFieldSubtypeNested(request.fieldSpec);

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
      totalCardinality: suggestions.length, // should only be 0 or 1, since this is only exact match searching
    };
  },
};
