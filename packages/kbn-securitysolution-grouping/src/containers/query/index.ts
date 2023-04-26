/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
  groupByFields,
  pageNumber,
  rootAggregations,
  runtimeMappings,
  size = DEFAULT_GROUP_BY_FIELD_SIZE,
  sort,
  statsAggregations,
  to,
}: GroupingQueryArgs): GroupingQuery => ({
  size: 0,
  aggs: {
    groupByFields: {
      ...(groupByFields.length > 1
        ? {
            multi_terms: {
              terms: groupByFields.map((groupByField) => ({
                field: groupByField,
              })),
              size: MAX_QUERY_SIZE,
            },
          }
        : {
            terms: {
              field: groupByFields[0],
              size: MAX_QUERY_SIZE,
            },
          }),
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
