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

import _ from 'lodash';
import { extractBuckets } from './_extract_buckets';
import AggConfigResult from '../../vis/agg_config_result';

export function HierarchicalTransformAggregationProvider() {
  return function transformAggregation(agg, metric, aggData, parent) {
    return _.map(extractBuckets(aggData, agg), function (bucket) {
      const aggConfigResult = new AggConfigResult(
        agg,
        parent && parent.aggConfigResult,
        metric.getValue(bucket),
        agg.getKey(bucket),
        bucket.filters
      );

      const branch = {
        name: agg.fieldFormatter()(bucket.key),
        size: aggConfigResult.value,
        aggConfig: agg,
        aggConfigResult: aggConfigResult
      };

      // if the parent is defined then we need to set the parent of the branch
      // this will be used later for filters for waking up the parent path.
      if (parent) {
        branch.parent = parent;
      }

      // If the next bucket exists and it has children the we need to
      // transform it as well. This is where the recursion happens.
      if (agg._next) {
        const nextBucket = bucket[agg._next.id];
        if (nextBucket && nextBucket.buckets) {
          branch.children = transformAggregation(agg._next, metric, nextBucket, branch);
        }
      }

      return branch;
    });
  };
}
