/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getFieldSubtypeNested } from '@kbn/data-views-plugin/common';
import { get } from 'lodash';

import { OptionsListRequestBody, OptionsListSuggestions } from '../../common/options_list/types';
import { getSortType } from './options_list_suggestion_query_helpers';
import { EsBucket, OptionsListSuggestionAggregationBuilder } from './types';

export const genericFetchAllSuggestions: OptionsListSuggestionAggregationBuilder = {
  buildAggregation: ({
    fieldName,
    searchString,
    fieldSpec,
    sort,
    size,
    allowExpensiveQueries,
  }: OptionsListRequestBody) => {
    if (searchString && searchString.length > 0) {
      // this should never be called with a search string
      return undefined;
    }

    let suggestionsAgg: { suggestions: any; unique_terms?: any } = {
      suggestions: {
        terms: {
          size,
          field: fieldName,
          shard_size: 10,
          order: getSortType(sort),
        },
      },
    };

    if (allowExpensiveQueries) {
      suggestionsAgg = {
        ...suggestionsAgg,
        unique_terms: {
          cardinality: {
            field: fieldName,
          },
        },
      };
    }

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
  parse: (rawEsResult, request: OptionsListRequestBody) => {
    const { fieldSpec } = request;
    if (!rawEsResult) {
      // if rawEsResult is undefined, then this was called with a search string - this should not
      // happen, but just in case, return an empty result
      return { suggestions: [], totalCardinality: 0 };
    }
    const subTypeNested = fieldSpec && getFieldSubtypeNested(fieldSpec);
    const suggestions = get(
      rawEsResult,
      `aggregations.${subTypeNested ? 'nestedSuggestions.suggestions' : 'suggestions'}.buckets`
    )?.reduce((acc: OptionsListSuggestions, suggestion: EsBucket) => {
      acc.push({ value: suggestion.key, docCount: suggestion.doc_count });
      return acc;
    }, []);
    return {
      suggestions,
      totalCardinality: request.allowExpensiveQueries
        ? get(
            rawEsResult,
            `aggregations.${
              subTypeNested ? 'nestedSuggestions.unique_terms' : 'unique_terms'
            }.value`
          )
        : undefined,
    };
  },
};
