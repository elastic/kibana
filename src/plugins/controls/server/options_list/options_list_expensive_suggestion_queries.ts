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
import { getIpRangeQuery, type IpRangeQuery } from '../../common/options_list/ip_search';
import { EsBucket, OptionsListSuggestionAggregationBuilder } from './types';
import { getIpBuckets, getSortType } from './options_list_suggestion_query_helpers';

/**
 * Suggestion aggregations
 */
export const getExpensiveSuggestionAggregationBuilder = ({ fieldSpec }: OptionsListRequestBody) => {
  if (fieldSpec?.type === 'boolean') {
    return expensiveSuggestionAggSubtypes.boolean;
  }
  if (fieldSpec?.type === 'ip') {
    return expensiveSuggestionAggSubtypes.ip;
  }
  return expensiveSuggestionAggSubtypes.textOrKeywordOrNested;
};

const expensiveSuggestionAggSubtypes: { [key: string]: OptionsListSuggestionAggregationBuilder } = {
  /**
   * The "textOrKeywordOrNested" query / parser should be used whenever the field is built on some type of string field,
   * regardless of if it is keyword only, keyword+text, or some nested keyword/keyword+text field.
   */
  textOrKeywordOrNested: {
    buildAggregation: ({
      searchString,
      fieldName,
      fieldSpec,
      sort,
      size,
    }: OptionsListRequestBody) => {
      const subTypeNested = fieldSpec && getFieldSubtypeNested(fieldSpec);
      let textOrKeywordQuery: any = {
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
      };
      if (searchString) {
        textOrKeywordQuery = {
          filteredSuggestions: {
            filter: {
              prefix: {
                [fieldName]: {
                  value: searchString,
                  case_insensitive: true,
                },
              },
            },
            aggs: { ...textOrKeywordQuery },
          },
        };
      }
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
    parse: (rawEsResult, request) => {
      let basePath = 'aggregations';
      const isNested = request.fieldSpec && getFieldSubtypeNested(request.fieldSpec);
      basePath += isNested ? '.nestedSuggestions' : '';
      basePath += request.searchString ? '.filteredSuggestions' : '';

      const suggestions = get(rawEsResult, `${basePath}.suggestions.buckets`)?.reduce(
        (acc: OptionsListSuggestions, suggestion: EsBucket) => {
          return [...acc, { value: suggestion.key, docCount: suggestion.doc_count }];
        },
        []
      );
      return {
        suggestions,
        totalCardinality: get(rawEsResult, `${basePath}.unique_terms.value`),
      };
    },
  },

  /**
   * the "Boolean" query / parser should be used when the options list is built on a field of type boolean. The query is slightly different than a keyword query.
   */
  boolean: {
    buildAggregation: ({ fieldName, sort }: OptionsListRequestBody) => ({
      suggestions: {
        terms: {
          field: fieldName,
          shard_size: 10,
          order: getSortType(sort),
        },
      },
    }),
    parse: (rawEsResult) => {
      const suggestions = get(rawEsResult, 'aggregations.suggestions.buckets')?.reduce(
        (acc: OptionsListSuggestions, suggestion: EsBucket & { key_as_string: string }) => {
          return [...acc, { value: suggestion.key_as_string, docCount: suggestion.doc_count }];
        },
        []
      );
      return { suggestions, totalCardinality: suggestions.length }; // cardinality is only ever 0, 1, or 2 so safe to use length here
    },
  },

  /**
   * the "IP" query / parser should be used when the options list is built on a field of type IP.
   */
  ip: {
    buildAggregation: ({ fieldName, searchString, sort, size }: OptionsListRequestBody) => {
      let ipRangeQuery: IpRangeQuery = {
        validSearch: true,
        rangeQuery: [
          {
            key: 'ipv6',
            from: '::',
            to: 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
          },
        ],
      };

      if (searchString) {
        ipRangeQuery = getIpRangeQuery(searchString);
        if (!ipRangeQuery.validSearch) {
          // ideally should be prevented on the client side but, if somehow an invalid search gets through to the server,
          // simply don't return an aggregation query for the ES search request
          return undefined;
        }
      }

      return {
        suggestions: {
          ip_range: {
            field: fieldName,
            ranges: ipRangeQuery.rangeQuery,
            keyed: true,
          },
          aggs: {
            filteredSuggestions: {
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
    },
    parse: (rawEsResult, request) => {
      if (!Boolean(rawEsResult.aggregations?.suggestions)) {
        // if this is happens, that means there is an invalid search that snuck through to the server side code;
        // so, might as well early return with no suggestions
        return { suggestions: [], totalCardinality: 0 };
      }
      const buckets: EsBucket[] = [];
      getIpBuckets(rawEsResult, buckets, 'ipv4'); // modifies buckets array directly, i.e. "by reference"
      getIpBuckets(rawEsResult, buckets, 'ipv6');

      const sortedSuggestions =
        request.sort?.direction === 'asc'
          ? buckets.sort(
              (bucketA: EsBucket, bucketB: EsBucket) => bucketA.doc_count - bucketB.doc_count
            )
          : buckets.sort(
              (bucketA: EsBucket, bucketB: EsBucket) => bucketB.doc_count - bucketA.doc_count
            );

      const suggestions = sortedSuggestions
        .slice(0, request.size)
        .reduce((acc: OptionsListSuggestions, suggestion: EsBucket) => {
          return [...acc, { value: suggestion.key, docCount: suggestion.doc_count }];
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
