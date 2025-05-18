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

import { getIpRangeQuery } from '../../../common/options_list/ip_search';
import { isValidSearch } from '../../../common/options_list/is_valid_search';
import { getDefaultSearchTechnique } from '../../../common/options_list/suggestions_searching';
import { OptionsListRequestBody, OptionsListSuggestions } from '../../../common/options_list/types';
import { EsBucket, OptionsListSuggestionAggregationBuilder } from '../types';
import { getExactMatchAggregationBuilder } from './options_list_exact_match';
import {
  getEscapedWildcardQuery,
  getIpBuckets,
  getSortType,
} from './options_list_suggestion_query_helpers';

/**
 * Type-specific search suggestion aggregations. These queries are highly impacted by the field type.
 */
export const getSearchSuggestionsAggregationBuilder = (request: OptionsListRequestBody) => {
  const { fieldSpec } = request;

  // note that date and boolean fields are non-searchable, so type-specific search aggs are not necessary;
  // number fields, on the other hand, only support exact match searching - so, this also does not need a
  // type-specific agg because it will be handled by `exactMatchSearchAggregation`
  switch (fieldSpec?.type) {
    case 'ip': {
      return suggestionAggSubtypes.ip;
    }
    case 'string': {
      return suggestionAggSubtypes.textOrKeywordOrNested;
    }
    default:
      // safe guard just in case an invalid/unsupported field type somehow got through
      return getExactMatchAggregationBuilder();
  }
};

const suggestionAggSubtypes: { [key: string]: OptionsListSuggestionAggregationBuilder } = {
  /**
   * The "textOrKeywordOrNested" query / parser should be used whenever the field is built on some type of string field,
   * regardless of if it is keyword only, keyword+text, or some nested keyword/keyword+text field.
   */
  textOrKeywordOrNested: {
    buildAggregation: ({
      searchTechnique,
      searchString,
      fieldName,
      fieldSpec,
      sort,
      size,
    }: OptionsListRequestBody) => {
      const hasSearchString = searchString && searchString.length > 0;
      if (!hasSearchString || fieldSpec?.type === 'date') {
        // we can assume that this is only ever called with a search string, and date fields are not
        // currently searchable; so, if any of these things is true, this is invalid.
        return undefined;
      }

      const subTypeNested = fieldSpec && getFieldSubtypeNested(fieldSpec);
      let textOrKeywordQuery: any = {
        filteredSuggestions: {
          filter: {
            [(searchTechnique ?? getDefaultSearchTechnique(fieldSpec?.type ?? 'string')) as string]:
              {
                [fieldName]: {
                  value:
                    searchTechnique === 'wildcard'
                      ? `*${getEscapedWildcardQuery(searchString)}*`
                      : searchString,
                  case_insensitive: true,
                },
              },
          },
          aggs: {
            suggestions: {
              terms: {
                size,
                field: fieldName,
                shard_size: 10,
                order: getSortType(sort),
              },
            },
            unique_terms: {
              cardinality: {
                field: fieldName,
              },
            },
          },
        },
      };

      if (subTypeNested) {
        textOrKeywordQuery = {
          nestedSuggestions: {
            nested: {
              path: subTypeNested.nested.path,
            },
            aggs: {
              ...textOrKeywordQuery,
            },
          },
        };
      }
      return textOrKeywordQuery;
    },
    parse: (rawEsResult, { fieldSpec }) => {
      let basePath = 'aggregations';
      const isNested = fieldSpec && getFieldSubtypeNested(fieldSpec);
      basePath += isNested ? '.nestedSuggestions.filteredSuggestions' : '.filteredSuggestions';

      const buckets = get(rawEsResult, `${basePath}.suggestions.buckets`, []) as EsBucket[];
      const suggestions = buckets.reduce((acc: OptionsListSuggestions, suggestion: EsBucket) => {
        acc.push({ value: suggestion.key, docCount: suggestion.doc_count });
        return acc;
      }, []);
      return {
        suggestions,
        totalCardinality: get(rawEsResult, `${basePath}.unique_terms.value`),
      };
    },
  },

  /**
   * the "IP" query / parser should be used when the options list is built on a field of type IP.
   */
  ip: {
    buildAggregation: ({ fieldName, searchString, sort, size }: OptionsListRequestBody) => {
      const filteredSuggestions = {
        terms: {
          size,
          field: fieldName,
          shard_size: 10,
          order: getSortType(sort),
        },
      };

      const ipRangeQuery = getIpRangeQuery(searchString ?? '');
      if (!ipRangeQuery.validSearch) {
        return {};
      }
      return {
        suggestions: {
          ip_range: {
            field: fieldName,
            ranges: ipRangeQuery.rangeQuery,
            keyed: true,
          },
          aggs: {
            filteredSuggestions,
            unique_terms: {
              cardinality: {
                field: fieldName,
              },
            },
          },
        },
      };
    },
    parse: (rawEsResult, { searchString, sort, fieldSpec, size, searchTechnique }) => {
      if (
        !searchString ||
        !isValidSearch({ searchString, fieldType: fieldSpec?.type, searchTechnique })
      ) {
        // if this is happens, that means there is an invalid search that snuck through to the server side code;
        // so, might as well early return with no suggestions
        return { suggestions: [], totalCardinality: 0 };
      }

      const buckets: EsBucket[] = [];
      getIpBuckets(rawEsResult, buckets, 'ipv4'); // modifies buckets array directly, i.e. "by reference"
      getIpBuckets(rawEsResult, buckets, 'ipv6');

      const sortedSuggestions =
        sort?.direction === 'asc'
          ? buckets.sort(
              (bucketA: EsBucket, bucketB: EsBucket) => bucketA.doc_count - bucketB.doc_count
            )
          : buckets.sort(
              (bucketA: EsBucket, bucketB: EsBucket) => bucketB.doc_count - bucketA.doc_count
            );

      const suggestions = sortedSuggestions
        .slice(0, size)
        .reduce((acc: OptionsListSuggestions, suggestion: EsBucket) => {
          acc.push({ value: suggestion.key, docCount: suggestion.doc_count });
          return acc;
        }, []);
      const totalCardinality =
        (get(rawEsResult, `aggregations.suggestions.buckets.ipv4.unique_terms.value`) ?? 0) +
        (get(rawEsResult, `aggregations.suggestions.buckets.ipv6.unique_terms.value`) ?? 0);
      return {
        suggestions,
        totalCardinality,
      };
    },
  },
};
