/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IAggType, IAggConfig, IndexPattern, search } from '@kbn/data-plugin/public';

const { propFilter } = search.aggs;
const filterByName = propFilter('name');

type AggTypeFilter = (
  aggType: IAggType,
  indexPattern: IndexPattern,
  aggConfig: IAggConfig,
  aggFilter: string[]
) => boolean;

const filters: AggTypeFilter[] = [
  /**
   * This filter checks the defined aggFilter in the schemas of that visualization
   * and limits available aggregations based on that.
   */
  (aggType, indexPattern, aggConfig, aggFilter) => {
    const doesSchemaAllowAggType = filterByName([aggType], aggFilter).length !== 0;
    return doesSchemaAllowAggType;
  },
  /**
   * Check index pattern aggregation restrictions and limit available aggTypes.
   */
  (aggType, indexPattern, aggConfig, aggFilter) => {
    const aggRestrictions = indexPattern.getAggregationRestrictions();

    if (!aggRestrictions) {
      return true;
    }

    const aggName = aggType.name;
    // Only return agg types which are specified in the agg restrictions,
    // except for `count` which should always be returned.
    return (
      aggName === 'count' ||
      (!!aggRestrictions && Object.keys(aggRestrictions).includes(aggName)) ||
      false
    );
  },
];

export function filterAggTypes(
  aggTypes: IAggType[],
  indexPattern: IndexPattern,
  aggConfig: IAggConfig,
  aggFilter: string[]
) {
  const allowedAggTypes = aggTypes.filter((aggType) => {
    const isAggTypeAllowed = filters.every((filter) =>
      filter(aggType, indexPattern, aggConfig, aggFilter)
    );
    return isAggTypeAllowed;
  });
  return allowedAggTypes;
}
