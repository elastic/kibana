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

import { findIndex, isEmpty } from 'lodash';
import { IAggConfig } from '../legacy_imports';
import { AggsState } from './agg_group_state';

const isAggRemovable = (agg: IAggConfig, group: IAggConfig[]) => {
  const metricCount = group.reduce(
    (count, aggregation: IAggConfig) =>
      aggregation.schema.name === agg.schema.name ? ++count : count,
    0
  );
  // make sure the the number of these aggs is above the min
  return metricCount > agg.schema.min;
};

const getEnabledMetricAggsCount = (group: IAggConfig[]) => {
  return group.reduce(
    (count, aggregation: IAggConfig) =>
      aggregation.schema.name === 'metric' && aggregation.enabled ? ++count : count,
    0
  );
};

const calcAggIsTooLow = (agg: IAggConfig, aggIndex: number, group: IAggConfig[]) => {
  if (!agg.schema.mustBeFirst) {
    return false;
  }

  const firstDifferentSchema = findIndex(group, (aggr: IAggConfig) => {
    return aggr.schema !== agg.schema;
  });

  if (firstDifferentSchema === -1) {
    return false;
  }

  return aggIndex > firstDifferentSchema;
};

function isInvalidAggsTouched(aggsState: AggsState) {
  const invalidAggs = Object.values(aggsState).filter(agg => !agg.valid);

  if (isEmpty(invalidAggs)) {
    return false;
  }

  return invalidAggs.every(agg => agg.touched);
}

export { isAggRemovable, calcAggIsTooLow, isInvalidAggsTouched, getEnabledMetricAggsCount };
