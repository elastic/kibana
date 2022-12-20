/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get, isEmpty } from 'lodash';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { getFieldSubtypeNested } from '@kbn/data-views-plugin/common';

import { OptionsListRequestBody, OptionsListSuggestions } from '../../common/options_list/types';
import {
  OPTIONS_LIST_DEFAULT_SORT,
  OptionsListSortingType,
} from '../../common/options_list/suggestions_sorting';
import { getIpRangeQuery, type IpRangeQuery } from '../../common/options_list/ip_search';

export interface OptionsListValidationAggregationBuilder {
  buildAggregation: (req: OptionsListRequestBody) => unknown;
  parse: (response: SearchResponse) => string[];
}

export interface OptionsListSuggestionAggregationBuilder {
  buildAggregation: (req: OptionsListRequestBody) => unknown;
  parse: (response: SearchResponse) => OptionsListSuggestions;
}

interface EsBucket {
  key: string;
  doc_count: number;
}

const getSortType = (sort?: OptionsListSortingType) => {
  return sort
    ? { [sort.by]: sort.direction }
    : { [OPTIONS_LIST_DEFAULT_SORT.by]: OPTIONS_LIST_DEFAULT_SORT.direction };
};

/**
 * Validation aggregations
 */
export const getValidationAggregationBuilder: () => OptionsListValidationAggregationBuilder =
  () => ({
    buildAggregation: ({ selectedOptions, fieldName }: OptionsListRequestBody) => {
      let selectedOptionsFilters;
      if (selectedOptions) {
        selectedOptionsFilters = selectedOptions.reduce((acc, currentOption) => {
          acc[currentOption] = { match: { [fieldName]: currentOption } };
          return acc;
        }, {} as { [key: string]: { match: { [key: string]: string } } });
      }
      return selectedOptionsFilters && !isEmpty(selectedOptionsFilters)
        ? {
            filters: {
              filters: selectedOptionsFilters,
            },
          }
        : undefined;
    },
    parse: (rawEsResult) => {
      const rawInvalidSuggestions = get(rawEsResult, 'aggregations.validation.buckets');
      return rawInvalidSuggestions && !isEmpty(rawInvalidSuggestions)
        ? Object.keys(rawInvalidSuggestions).filter(
            (key) => rawInvalidSuggestions[key].doc_count === 0
          )
        : [];
    },
  });

/**
 * Suggestion aggregations
 */
export const getSuggestionAggregationBuilder = ({
  fieldSpec,
  textFieldName,
  searchString,
}: OptionsListRequestBody) => {
  if (textFieldName && fieldSpec?.aggregatable && searchString) {
    return suggestionAggSubtypes.keywordAndText;
  }
  if (fieldSpec?.type === 'boolean') {
    return suggestionAggSubtypes.boolean;
  }
  if (fieldSpec?.type === 'ip') {
    return suggestionAggSubtypes.ip;
  }
  if (fieldSpec && getFieldSubtypeNested(fieldSpec)) {
    return suggestionAggSubtypes.subtypeNested;
  }
  return suggestionAggSubtypes.keywordOnly;
};

const getEscapedQuery = (q: string = '') =>
  q.replace(/[.?+*|{}[\]()"\\#@&<>~]/g, (match) => `\\${match}`);

const getIpBuckets = (rawEsResult: any, combinedBuckets: EsBucket[], type: 'ipv4' | 'ipv6') => {
  const results = get(
    rawEsResult,
    `aggregations.suggestions.buckets.${type}.filteredSuggestions.buckets`
  );
  if (results) {
    results.forEach((suggestion: EsBucket) => combinedBuckets.push(suggestion));
  }
};

const suggestionAggSubtypes: { [key: string]: OptionsListSuggestionAggregationBuilder } = {
  /**
   * the "Keyword only" query / parser should be used when the options list is built on a field which has only keyword mappings.
   */
  keywordOnly: {
    buildAggregation: ({ fieldName, searchString, sort }: OptionsListRequestBody) => ({
      terms: {
        field: fieldName,
        include: `${getEscapedQuery(searchString)}.*`,
        execution_hint: 'map',
        shard_size: 10,
        order: getSortType(sort),
      },
    }),
    parse: (rawEsResult) =>
      get(rawEsResult, 'aggregations.suggestions.buckets').reduce(
        (suggestions: OptionsListSuggestions, suggestion: EsBucket) => {
          return { ...suggestions, [suggestion.key]: { doc_count: suggestion.doc_count } };
        },
        {}
      ),
  },

  /**
   * the "Keyword and text" query / parser should be used when the options list is built on a multi-field which has both keyword and text mappings. It supports case-insensitive searching
   */
  keywordAndText: {
    buildAggregation: (req: OptionsListRequestBody) => {
      if (!req.textFieldName) {
        // if there is no textFieldName specified, or if there is no search string yet fall back to keywordOnly
        return suggestionAggSubtypes.keywordOnly.buildAggregation(req);
      }
      const { fieldName, searchString, textFieldName, sort } = req;
      return {
        filter: {
          match_phrase_prefix: {
            [textFieldName]: searchString,
          },
        },
        aggs: {
          keywordSuggestions: {
            terms: {
              field: fieldName,
              shard_size: 10,
              order: getSortType(sort),
            },
          },
        },
      };
    },
    parse: (rawEsResult) =>
      get(rawEsResult, 'aggregations.suggestions.keywordSuggestions.buckets').reduce(
        (suggestions: OptionsListSuggestions, suggestion: EsBucket) => {
          return { ...suggestions, [suggestion.key]: { doc_count: suggestion.doc_count } };
        },
        {}
      ),
  },

  /**
   * the "Boolean" query / parser should be used when the options list is built on a field of type boolean. The query is slightly different than a keyword query.
   */
  boolean: {
    buildAggregation: ({ fieldName, sort }: OptionsListRequestBody) => ({
      terms: {
        field: fieldName,
        execution_hint: 'map',
        shard_size: 10,
        order: getSortType(sort),
      },
    }),
    parse: (rawEsResult) =>
      get(rawEsResult, 'aggregations.suggestions.buckets')?.reduce(
        (suggestions: OptionsListSuggestions, suggestion: EsBucket & { key_as_string: string }) => {
          return {
            ...suggestions,
            [suggestion.key_as_string]: { doc_count: suggestion.doc_count },
          };
        },
        {}
      ),
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
        ip_range: {
          field: fieldName,
          ranges: ipRangeQuery.rangeQuery,
          keyed: true,
        },
        aggs: {
          filteredSuggestions: {
            terms: {
              field: fieldName,
              execution_hint: 'map',
              shard_size: 10,
              order: getSortType(sort),
            },
          },
        },
      };
    },
    parse: (rawEsResult) => {
      if (!Boolean(rawEsResult.aggregations?.suggestions)) {
        // if this is happens, that means there is an invalid search that snuck through to the server side code;
        // so, might as well early return with no suggestions
        return [];
      }

      const buckets: EsBucket[] = [];
      getIpBuckets(rawEsResult, buckets, 'ipv4'); // modifies buckets array directly, i.e. "by reference"
      getIpBuckets(rawEsResult, buckets, 'ipv6');
      return buckets
        .sort((bucketA: EsBucket, bucketB: EsBucket) => bucketB.doc_count - bucketA.doc_count)
        .slice(0, 10) // only return top 10 results
        .reduce((suggestions, suggestion: EsBucket) => {
          return { ...suggestions, [suggestion.key]: { doc_count: suggestion.doc_count } };
        }, {});
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
        return suggestionAggSubtypes.keywordOnly.buildAggregation(req);
      }
      return {
        nested: {
          path: subTypeNested.nested.path,
        },
        aggs: {
          nestedSuggestions: {
            terms: {
              field: fieldName,
              include: `${getEscapedQuery(searchString)}.*`,
              execution_hint: 'map',
              shard_size: 10,
              order: getSortType(sort),
            },
          },
        },
      };
    },
    parse: (rawEsResult) =>
      get(rawEsResult, 'aggregations.suggestions.nestedSuggestions.buckets').reduce(
        (suggestions: OptionsListSuggestions, suggestion: EsBucket) => {
          return { ...suggestions, [suggestion.key]: { doc_count: suggestion.doc_count } };
        },
        {}
      ),
  },
};
