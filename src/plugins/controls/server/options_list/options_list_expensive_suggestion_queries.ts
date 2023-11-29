/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getFieldSubtypeNested } from '@kbn/data-views-plugin/common';
import { get } from 'lodash';

import { getIpRangeQuery, getIsValidIp } from '../../common/options_list/ip_search';
import { getDefaultSearchTechnique } from '../../common/options_list/suggestions_searching';
import { OptionsListRequestBody, OptionsListSuggestions } from '../../common/options_list/types';
import {
  getEscapedWildcardQuery,
  getIpBuckets,
  getSortType,
} from './options_list_suggestion_query_helpers';
import { EsBucket, OptionsListSuggestionAggregationBuilder } from './types';

/**
 * Suggestion aggregations
 */
export const getExpensiveSuggestionAggregationBuilder = ({
  fieldSpec,
  searchString,
}: OptionsListRequestBody) => {
  const hasSearchString = searchString && searchString.length > 0;

  if (!hasSearchString) {
    // the field type only matters when there is a search string; so, if no search string,
    // return generic "fetch all" aggregation builder
    return expensiveSuggestionAggSubtypes.genericNoSearchStringFetchAll;
  }

  // note that date and boolean fields are non-searchable, so type-specific search aggs are not necessary
  switch (fieldSpec?.type) {
    case 'number': {
      return expensiveSuggestionAggSubtypes.number;
    }
    case 'ip': {
      return expensiveSuggestionAggSubtypes.ip;
    }
    default: {
      return expensiveSuggestionAggSubtypes.textOrKeywordOrNested;
    }
  }
};

const expensiveSuggestionAggSubtypes: { [key: string]: OptionsListSuggestionAggregationBuilder } = {
  genericNoSearchStringFetchAll: {
    buildAggregation: ({ fieldName, searchString, size, sort }: OptionsListRequestBody) => {
      if (searchString && searchString.length > 0) {
        // this should never be called with a search string
        return undefined;
      }

      return {
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
        totalCardinality: get(rawEsResult, `aggregations.unique_terms.value`),
      };
    },
  },

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
    parse: (rawEsResult, request) => {
      let basePath = 'aggregations';
      const isNested = request.fieldSpec && getFieldSubtypeNested(request.fieldSpec);
      basePath += isNested ? '.nestedSuggestions.filteredSuggestions' : '.filteredSuggestions';

      const suggestions = get(rawEsResult, `${basePath}.suggestions.buckets`)?.reduce(
        (acc: OptionsListSuggestions, suggestion: EsBucket) => {
          acc.push({ value: suggestion.key, docCount: suggestion.doc_count });
          return acc;
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
   * the "number" query / parser should be used when the options list is built on a field of type float, long, etc.
   */
  number: {
    buildAggregation: (request: OptionsListRequestBody) => {
      const { searchString } = request;
      const hasSearchString = searchString && searchString.length > 0;

      if (!hasSearchString || isNaN(Number(searchString))) {
        // we can assume that this is only ever called with a search string + invalid searches should never get
        // from the client side to the server side but adding this as a safe guard just in case
        return undefined;
      }

      // only exact match searching is supported for number fields
      return exactMatchSearchAggBuilder.buildAggregation(request);
    },
    parse: (rawEsResult, request) => {
      return exactMatchSearchAggBuilder.parse(rawEsResult, request);
    },
  },

  /**
   * the "IP" query / parser should be used when the options list is built on a field of type IP.
   */
  ip: {
    buildAggregation: (request: OptionsListRequestBody) => {
      const { fieldName, searchString, searchTechnique, sort, size } = request;
      const hasSearchString = searchString && searchString.length > 0;

      if (!hasSearchString) {
        // we can assume that this is only ever called with a search string
        return undefined;
      }

      const filteredSuggestions = {
        terms: {
          size,
          field: fieldName,
          shard_size: 10,
          order: getSortType(sort),
        },
      };

      // we have a search string, so handle it according to the search technique (exact match or prefix)
      if (searchTechnique === 'exact') {
        const searchStringValid = getIsValidIp(searchString);
        if (!searchStringValid) {
          // ideally should be prevented on the client side but, if somehow an invalid search gets through to the server,
          // simply don't return an aggregation query for the ES search request
          return undefined;
        }
        return exactMatchSearchAggBuilder.buildAggregation(request);
      } else {
        const ipRangeQuery = getIpRangeQuery(searchString);
        if (!ipRangeQuery.validSearch) {
          return undefined;
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
      }
    },
    parse: (rawEsResult, request) => {
      const { searchString, searchTechnique } = request;
      const hasSearchString = searchString && searchString.length > 0;
      if (searchTechnique === 'exact' && hasSearchString) {
        return exactMatchSearchAggBuilder.parse(rawEsResult, request);
      }

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
