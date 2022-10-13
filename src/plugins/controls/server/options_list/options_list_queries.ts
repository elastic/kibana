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

import { OptionsListRequestBody } from '../../common/options_list/types';
import { getIpRangeQuery, type IpRangeQuery } from '../../common/options_list/ip_search';
export interface OptionsListAggregationBuilder {
  buildAggregation: (req: OptionsListRequestBody) => unknown;
  parse: (response: SearchResponse) => string[];
}

interface EsBucket {
  key: string;
  doc_count: number;
}

/**
 * Validation aggregations
 */
export const getValidationAggregationBuilder: () => OptionsListAggregationBuilder = () => ({
  buildAggregation: ({ selectedOptions, fieldName }: OptionsListRequestBody) => {
    const selectedOptionsFilters = selectedOptions?.reduce((acc, currentOption) => {
      acc[currentOption] = { match: { [fieldName]: currentOption } };
      return acc;
    }, {} as { [key: string]: { match: { [key: string]: string } } });

    return selectedOptionsFilters && !isEmpty(selectedOptionsFilters)
      ? {
          filters: {
            filters: selectedOptionsFilters,
          },
        }
      : undefined;
  },
  parse: (rawEsResult) => {
    const rawInvalidSuggestions = get(rawEsResult, 'aggregations.validation.buckets') as {
      [key: string]: { doc_count: number };
    };
    return rawInvalidSuggestions && !isEmpty(rawInvalidSuggestions)
      ? Object.entries(rawInvalidSuggestions)
          ?.filter(([, value]) => value?.doc_count === 0)
          ?.map(([key]) => key)
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

const suggestionAggSubtypes: { [key: string]: OptionsListAggregationBuilder } = {
  /**
   * the "Keyword only" query / parser should be used when the options list is built on a field which has only keyword mappings.
   */
  keywordOnly: {
    buildAggregation: ({ fieldName, searchString }: OptionsListRequestBody) => ({
      terms: {
        field: fieldName,
        include: `${getEscapedQuery(searchString)}.*`,
        execution_hint: 'map',
        shard_size: 10,
      },
    }),
    parse: (rawEsResult) =>
      get(rawEsResult, 'aggregations.suggestions.buckets')?.map(
        (suggestion: { key: string }) => suggestion.key
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
      const { fieldName, searchString, textFieldName } = req;
      return {
        filter: {
          match_phrase_prefix: {
            [textFieldName]: getEscapedQuery(searchString),
          },
        },
        aggs: {
          keywordSuggestions: {
            terms: {
              field: fieldName,
              shard_size: 10,
            },
          },
        },
      };
    },
    parse: (rawEsResult) =>
      get(rawEsResult, 'aggregations.suggestions.keywordSuggestions.buckets')?.map(
        (suggestion: { key: string }) => suggestion.key
      ),
  },

  /**
   * the "Boolean" query / parser should be used when the options list is built on a field of type boolean. The query is slightly different than a keyword query.
   */
  boolean: {
    buildAggregation: ({ fieldName }: OptionsListRequestBody) => ({
      terms: {
        field: fieldName,
        execution_hint: 'map',
        shard_size: 10,
      },
    }),
    parse: (rawEsResult) =>
      get(rawEsResult, 'aggregations.suggestions.buckets')?.map(
        (suggestion: { key_as_string: string }) => suggestion.key_as_string
      ),
  },

  /**
   * the "IP" query / parser should be used when the options list is built on a field of type IP.
   */
  ip: {
    buildAggregation: ({ fieldName, searchString }: OptionsListRequestBody) => {
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
        .map((bucket: EsBucket) => bucket.key);
    },
  },

  /**
   * the "Subtype Nested" query / parser should be used when the options list is built on a field with subtype nested.
   */
  subtypeNested: {
    buildAggregation: (req: OptionsListRequestBody) => {
      const { fieldSpec, fieldName, searchString } = req;
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
            },
          },
        },
      };
    },
    parse: (rawEsResult) =>
      get(rawEsResult, 'aggregations.suggestions.nestedSuggestions.buckets')?.map(
        (suggestion: { key: string }) => suggestion.key
      ),
  },
};
