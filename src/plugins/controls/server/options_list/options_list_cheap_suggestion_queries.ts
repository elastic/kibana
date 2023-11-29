/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { getFieldSubtypeNested } from '@kbn/data-views-plugin/common';

import { OptionsListRequestBody, OptionsListSuggestions } from '../../common/options_list/types';
import { EsBucket, OptionsListSuggestionAggregationBuilder } from './types';
import { getEscapedRegexQuery, getSortType } from './options_list_suggestion_query_helpers';

/**
 * Suggestion aggregations
 */
export const getCheapSuggestionAggregationBuilder = ({
  fieldSpec,
  searchString,
}: OptionsListRequestBody) => {
  const hasSearchString = searchString && searchString.length > 0;
  if (!hasSearchString) {
    // the field type only matters when there is a search string; so, if no search string,
    // return generic "fetch all" aggregation builder
    return cheapSuggestionAggSubtypes.genericNoSearchStringFetchAll;
  }

  if (fieldSpec && getFieldSubtypeNested(fieldSpec)) {
    return cheapSuggestionAggSubtypes.subtypeNested;
  }
  return cheapSuggestionAggSubtypes.exactMatchSearch;
};

const cheapSuggestionAggSubtypes: { [key: string]: OptionsListSuggestionAggregationBuilder } = {
  genericNoSearchStringFetchAll: {
    buildAggregation: ({ fieldName, searchString, size, sort }: OptionsListRequestBody) => {
      if (searchString && searchString.length > 0) {
        // this should never be called with a search string
        return undefined;
      }

      return {
        suggestions: {
          terms: {
            field: fieldName,
            shard_size: 10,
            order: getSortType(sort),
          },
        },
      };
    },
    parse: (rawEsResult, request: OptionsListRequestBody) => {
      const { searchString } = request;
      if (!rawEsResult || (searchString && searchString.length > 0)) {
        // this should never be called with a search string
        return { suggestions: [], totalCardinality: 0 };
      }
      const suggestions = get(rawEsResult, `aggregations.suggestions.buckets`)?.reduce(
        (acc: OptionsListSuggestions, suggestion: EsBucket) => {
          acc.push({ value: suggestion.key, docCount: suggestion.doc_count });
          return acc;
        },
        []
      );
      return {
        suggestions,
      };
    },
  },

  /**
   * the "Subtype Nested" query / parser should be used when the options list is built on a field with subtype nested.
   */
  subtypeNested: {
    buildAggregation: (req: OptionsListRequestBody) => {
      console.log('SUB TYPE NESTED');
      const { fieldSpec, fieldName, searchString, sort } = req;
      const subTypeNested = fieldSpec && getFieldSubtypeNested(fieldSpec);
      if (!subTypeNested) {
        // if this field is not subtype nested, fall back to keywordOnly
        return cheapSuggestionAggSubtypes.keywordOnly.buildAggregation(req);
      }
      return {
        nestedSuggestions: {
          nested: {
            path: subTypeNested.nested.path,
          },
          aggs: {
            suggestions: {
              terms: {
                field: fieldName,
                ...(searchString && searchString.length > 0
                  ? { include: `${getEscapedRegexQuery(searchString)}.*` }
                  : {}),
                shard_size: 10,
                order: getSortType(sort),
              },
            },
          },
        },
      };
    },
    parse: (rawEsResult) => ({
      suggestions: get(rawEsResult, 'aggregations.nestedSuggestions.suggestions.buckets')?.reduce(
        (acc: OptionsListSuggestions, suggestion: EsBucket) => {
          acc.push({ value: suggestion.key, docCount: suggestion.doc_count });
          return acc;
        },
        []
      ),
    }),
  },

  exactMatchSearch: {
    buildAggregation: ({ fieldName, searchString }: OptionsListRequestBody) => {
      if (!searchString || searchString.length === 0) {
        // this must be called with a search string
        return undefined;
      }

      return {
        suggestions: {
          filter: {
            term: {
              [fieldName]: searchString,
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
    },
    parse: (rawEsResult) => {
      if (!rawEsResult || !Boolean(rawEsResult.aggregations?.suggestions)) {
        return { suggestions: [], totalCardinality: 0 };
      }
      const suggestions = get(
        rawEsResult,
        `aggregations.suggestions.filteredSuggestions.buckets`
      )?.reduce((acc: OptionsListSuggestions, suggestion: EsBucket) => {
        acc.push({ value: suggestion.key, docCount: suggestion.doc_count });
        return acc;
      }, []);
      return {
        suggestions,
        totalCardinality: suggestions.length, // should only be 0 or 1, since only exact match searching is allowed
      };
    },
  },
};

const exactMatchSearchAggBuilder: OptionsListSuggestionAggregationBuilder = {
  buildAggregation: ({ fieldName, searchString }: OptionsListRequestBody) => {
    if (!searchString || searchString.length === 0) {
      // this must be called with a search string
      return undefined;
    }

    return {
      suggestions: {
        filter: {
          term: {
            [fieldName]: searchString,
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
  },
  parse: (rawEsResult) => {
    if (!rawEsResult || !Boolean(rawEsResult.aggregations?.suggestions)) {
      return { suggestions: [], totalCardinality: 0 };
    }
    const suggestions = get(
      rawEsResult,
      `aggregations.suggestions.filteredSuggestions.buckets`
    )?.reduce((acc: OptionsListSuggestions, suggestion: EsBucket) => {
      acc.push({ value: suggestion.key, docCount: suggestion.doc_count });
      return acc;
    }, []);
    return {
      suggestions,
      totalCardinality: suggestions.length, // should only be 0 or 1, since only exact match searching is allowed
    };
  },
};
