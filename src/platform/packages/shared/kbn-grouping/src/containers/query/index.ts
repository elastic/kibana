/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getEmptyValue } from './helpers';
import { GroupingAggregation, ParsedGroupingAggregation } from '../..';
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
 * @param uniqueValue unique value to use for crazy query magic
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
  size = DEFAULT_GROUP_BY_FIELD_SIZE,
  sort,
  statsAggregations,
  to,
  uniqueValue,
}: GroupingQueryArgs): GroupingQuery => ({
  size: 0,
  runtime_mappings: {
    ...runtimeMappings,
    groupByField: {
      type: 'keyword',
      script: {
        source:
          // when size()==0, emits a uniqueValue as the value to represent this group  else join by uniqueValue.
          "if (doc[params['selectedGroup']].size()==0) { emit(params['uniqueValue']) }" +
          // Else, join the values with uniqueValue. We cannot simply emit the value like doc[params['selectedGroup']].value,
          // the runtime field will only return the first value in an array.
          // The docs advise that if the field has multiple values, "Scripts can call the emit method multiple times to emit multiple values."
          // However, this gives us a group for each value instead of combining the values like we're aiming for.
          // Instead of .value, we can retrieve all values with .join().
          // Instead of joining with a "," we should join with a unique value to avoid splitting a value that happens to contain a ",".
          // We will format into a proper array in parseGroupingQuery .
          " else { emit(doc[params['selectedGroup']].join(params['uniqueValue']))}",
        params: {
          selectedGroup: groupByField,
          uniqueValue,
        },
      },
    },
  },
  aggs: {
    groupByFields: {
      terms: {
        field: 'groupByField',
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

    unitsCount: { value_count: { field: 'groupByField' } },
    groupsCount: { cardinality: { field: 'groupByField' } },

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
  _source: false,
});

/**
 * Parses the grouping query response to add the isNullGroup
 * flag to the buckets and to format the bucket keys
 * @param selectedGroup from the grouping query
 * @param uniqueValue from the grouping query
 * @param aggs aggregation response from the grouping query
 */
export const parseGroupingQuery = <T>(
  selectedGroup: string,
  uniqueValue: string,
  aggs?: GroupingAggregation<T>
): ParsedGroupingAggregation<T> | {} => {
  if (!aggs) {
    return {};
  }
  const groupByFields = aggs?.groupByFields?.buckets?.map((group) => {
    const emptyValue = getEmptyValue();
    if (group.key === uniqueValue) {
      return {
        ...group,
        key: [emptyValue],
        selectedGroup,
        key_as_string: emptyValue,
        isNullGroup: true,
      };
    }
    // doing isArray check for TS
    // the key won't be an array, runtime fields cannot be multivalued
    const groupKey = Array.isArray(group.key) ? group.key[0] : group.key;
    const valueAsArray = groupKey.split(uniqueValue);
    return {
      ...group,
      key: valueAsArray,
      selectedGroup,
      key_as_string: valueAsArray.join(', '),
    };
  });

  return {
    ...aggs,
    groupByFields: { buckets: groupByFields },
    groupsCount: {
      value: aggs.groupsCount?.value ?? 0,
    },
  };
};
