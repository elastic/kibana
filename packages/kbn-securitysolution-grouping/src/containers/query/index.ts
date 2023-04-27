/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getEmptyValue, getFieldTypeMissingValues } from './helpers';
import { GroupingBucket } from '../..';
import { RawBucket } from '../../..';
import type { GroupingQueryArgs, GroupingQuery } from './types';
/** The maximum number of groups to render */
export const DEFAULT_GROUP_BY_FIELD_SIZE = 10;

// our pagination will be broken if the stackBy field cardinality exceeds 10,000
// https://github.com/elastic/kibana/issues/151913
export const MAX_QUERY_SIZE = 10000;

/**
 * Composes grouping query and aggregations
 * @param additionalFilters Global filtering applicable to the grouping component.
 * Array of {@link BoolAgg} to be added to the query
 * @param from starting timestamp
 * @param groupByFields array of field names to group by
 * @param pageNumber starting grouping results page number
 * @param rootAggregations Top level aggregations to get the groups number or overall groups metrics.
 * Array of {@link NamedAggregation}
 * @param runtimeMappings mappings of runtime fields [see runtimeMappings]{@link GroupingQueryArgs.runtimeMappings}
 * @param selectedGroupEsTypes array of selected group types
 * @param size number of grouping results per page
 * @param sort add one or more sorts on specific fields
 * @param statsAggregations group level aggregations which correspond to {@link GroupStatsRenderer} configuration
 * @param to ending timestamp
 *
 * @returns query dsl {@link GroupingQuery}
 */

export const getGroupingQuery = ({
  additionalFilters = [],
  from,
  groupByField,
  pageNumber,
  rootAggregations,
  runtimeMappings,
  selectedGroupEsTypes,
  size = DEFAULT_GROUP_BY_FIELD_SIZE,
  sort,
  statsAggregations,
  to,
}: GroupingQueryArgs): GroupingQuery => ({
  size: 0,
  aggs: {
    groupByFields: {
      multi_terms: {
        terms: [
          // by looking up multiple missing values, we can ensure we're not overwriting an existing group with the default value
          {
            field: groupByField,
            // the AggregationsMultiTermLookup type is wrong in the elasticsearch node package
            // see linked slack thread to find out when we can remove these ts expect errors
            // https://urle.me/eAq
            // @ts-expect-error
            missing: getFieldTypeMissingValues(selectedGroupEsTypes)[0],
          },
          {
            field: groupByField,
            // @ts-expect-error
            missing: getFieldTypeMissingValues(selectedGroupEsTypes)[1],
          },
        ],
        size: MAX_QUERY_SIZE,
      },
      aggs: {
        bucket_truncate: {
          bucket_sort: {
            sort,
            from: pageNumber,
            size,
          },
        },
        ...(statsAggregations
          ? statsAggregations.reduce((aggObj, subAgg) => Object.assign(aggObj, subAgg), {})
          : {}),
      },
    },
    ...(rootAggregations
      ? rootAggregations.reduce((aggObj, subAgg) => Object.assign(aggObj, subAgg), {})
      : {}),
  },
  query: {
    bool: {
      filter: [
        ...additionalFilters,
        {
          range: {
            '@timestamp': {
              gte: from,
              lte: to,
            },
          },
        },
      ],
    },
  },
  runtime_mappings: runtimeMappings,
  _source: false,
});

/**
 * Parses the grouping query response to add the isNullGroup
 * flag to the buckets and to format the bucket keys
 * @param buckets buckets returned from the grouping query
 */
export const parseGroupingQuery = <T>(
  buckets: Array<RawBucket<T>>
): Array<RawBucket<T> & GroupingBucket> =>
  buckets.map((group) => {
    if (!Array.isArray(group.key)) {
      return group;
    }
    const emptyValue = getEmptyValue();
    // If the keys are different means that the `missing` values of the multi_terms aggregation have been applied, we use the default empty string.
    // If the keys are equal means the `missing` values have not been applied, they are stored values.
    return groupKeyArray[0] === groupKeyArray[1]
      ? {
          ...group,
          key: [groupKeyArray[0]],
          key_as_string: groupKeyArray[0],
        }
      : {
          ...group,
          key: [emptyValue],
          key_as_string: emptyValue,
          isNullGroup: true,
        };
  });
