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

export interface OptionsListAggregationBuilder {
  buildAggregation: (req: OptionsListRequestBody) => unknown;
  parse: (response: SearchResponse) => string[];
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
      let rangeQuery: { from: string; to: string } | { mask: string } = {
        from: '0.0.0.0',
        to: '255.255.255.255',
      };
      if (searchString) {
        const ipSegments = searchString
          .replace(/[^\d.]/g, '') // remove any non-numeric characters, excluding periods
          .split('.')
          .filter((segment) => segment !== '' && parseInt(segment, 10) <= 255); // prevent invalid IP search
        if (ipSegments.length === 4) {
          // if a full IP is given, then use CIDR mask to generate the proper range
          // i.e. if the search string is `a.b.c.d` then `a.b.c.d\32` is equivalent to the range `a.b.c.d` to `a.b.c.(d+1)`
          rangeQuery = { mask: searchString + '/32' };
        } else {
          // if a partial IP is provided as a search string, then find IPs that **start** with the given partial IP
          // i.e. if the search string is `a.b` then do a search for IPs in the range `a.b.0.0` to `a.b.255.255`
          const minIp = ipSegments.concat(Array(4 - ipSegments.length).fill('0')).join('.');
          const maxIp = ipSegments.concat(Array(4 - ipSegments.length).fill('255')).join('.');
          rangeQuery = { from: minIp, to: maxIp };
        }
      }

      return {
        ip_range: {
          field: fieldName,
          ranges: [{ key: 'rangeResults', ...rangeQuery }],
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
    parse: (rawEsResult) =>
      get(
        rawEsResult,
        'aggregations.suggestions.buckets.rangeResults.filteredSuggestions.buckets'
      )?.map((suggestion: { key: string }) => suggestion.key),
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
