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
import {
  getEscapedQuery,
  getIpBuckets,
  getSortType,
} from './options_list_suggestion_query_helpers';

/**
 * Suggestion aggregations
 */
export const getCheapSuggestionAggregationBuilder = ({ fieldSpec }: OptionsListRequestBody) => {
  if (fieldSpec?.type === 'boolean') {
    return cheapSuggestionAggSubtypes.boolean;
  }
  if (fieldSpec?.type === 'ip') {
    return cheapSuggestionAggSubtypes.ip;
  }
  if (fieldSpec && getFieldSubtypeNested(fieldSpec)) {
    return cheapSuggestionAggSubtypes.subtypeNested;
  }
  return cheapSuggestionAggSubtypes.keywordOrText;
};

const cheapSuggestionAggSubtypes: { [key: string]: OptionsListSuggestionAggregationBuilder } = {
  /**
   * The "textOrKeyword" query / parser should be used whenever the field is built on some type non-nested string field
   * (such as a keyword field or a keyword+text multi-field)
   */
  keywordOrText: {
    buildAggregation: ({ fieldName, searchString, sort }: OptionsListRequestBody) => ({
      suggestions: {
        terms: {
          field: fieldName,
          include: `${getEscapedQuery(searchString)}.*`,
          shard_size: 10,
          order: getSortType(sort),
        },
      },
    }),
    parse: (rawEsResult) => ({
      suggestions: get(rawEsResult, 'aggregations.suggestions.buckets')?.reduce(
        (acc: OptionsListSuggestions, suggestion: EsBucket) => {
          acc.push({ value: suggestion.key, docCount: suggestion.doc_count });
          return acc;
        },
        []
      ),
    }),
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
    parse: (rawEsResult) => ({
      suggestions: get(rawEsResult, 'aggregations.suggestions.buckets')?.reduce(
        (acc: OptionsListSuggestions, suggestion: EsBucket & { key_as_string: string }) => {
          acc.push({ value: suggestion.key_as_string, docCount: suggestion.doc_count });
          return acc;
        },
        []
      ),
    }),
  },

  /**
   * the "IP" query / parser should be used when the options list is built on a field of type IP.
   */
  ip: {
    buildAggregation: ({ fieldName, searchString, sort }: OptionsListRequestBody) => {
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
                field: fieldName,
                shard_size: 10,
                order: getSortType(sort),
              },
            },
          },
        },
      };
    },
    parse: (rawEsResult, { sort }) => {
      if (!Boolean(rawEsResult.aggregations?.suggestions)) {
        // if this is happens, that means there is an invalid search that snuck through to the server side code;
        // so, might as well early return with no suggestions
        return { suggestions: [] };
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

      return {
        suggestions: sortedSuggestions
          .slice(0, 10) // only return top 10 results
          .reduce((acc: OptionsListSuggestions, suggestion: EsBucket) => {
            acc.push({ value: suggestion.key, docCount: suggestion.doc_count });
            return acc;
          }, []),
      };
    },
  },

  /**
   * the "Subtype Nested" query / parser should be used when the options list is built on a field with subtype nested.
   */
  subtypeNested: {
    buildAggregation: (req: OptionsListRequestBody) => {
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
                include: `${getEscapedQuery(searchString)}.*`,
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
};
