/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFieldSubtypeNested } from '@kbn/data-views-plugin/common';
import { get } from 'lodash';

import { OptionsListRequestBody, OptionsListSuggestions } from '../../../common/options_list/types';
import { EsBucket, OptionsListSuggestionAggregationBuilder } from '../types';
import { getSortType } from './options_list_suggestion_query_helpers';

/**
 * Fetch all suggestions without any additional searching/filtering.
 * This query will be more-or-less the same for **all** field types,
 */
export const getAllSuggestionsAggregationBuilder: () => OptionsListSuggestionAggregationBuilder =
  () => allSuggestionsAggregationBuilder;

const allSuggestionsAggregationBuilder: OptionsListSuggestionAggregationBuilder = {
  buildAggregation: ({
    fieldName,
    fieldSpec,
    sort,
    size,
    allowExpensiveQueries,
  }: OptionsListRequestBody) => {
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
  parse: (rawEsResult, { fieldSpec, allowExpensiveQueries }: OptionsListRequestBody) => {
    const subTypeNested = fieldSpec && getFieldSubtypeNested(fieldSpec);
    const suggestions = get(
      rawEsResult,
      `aggregations.${subTypeNested ? 'nestedSuggestions.suggestions' : 'suggestions'}.buckets`
    )?.reduce((acc: OptionsListSuggestions, suggestion: EsBucket) => {
      acc.push({
        value:
          fieldSpec?.type === 'boolean' && suggestion.key_as_string
            ? suggestion.key_as_string
            : suggestion.key,
        docCount: suggestion.doc_count,
      });
      return acc;
    }, []);
    return {
      suggestions,
      totalCardinality: allowExpensiveQueries
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
