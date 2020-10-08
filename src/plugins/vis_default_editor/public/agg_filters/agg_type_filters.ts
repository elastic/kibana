/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { IAggType, IAggConfig, IndexPattern, search } from '../../../data/public';

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
