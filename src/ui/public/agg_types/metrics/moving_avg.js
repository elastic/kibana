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

import { MetricAggType } from './metric_agg_type';
import { parentPipelineAggHelper } from './lib/parent_pipeline_agg_helper';
import { makeNestedLabel } from './lib/make_nested_label';

export const movingAvgMetricAgg = new MetricAggType({
  name: 'moving_avg',
  dslName: 'moving_fn',
  title: 'Moving Avg',
  subtype: parentPipelineAggHelper.subtype,
  makeLabel: agg => makeNestedLabel(agg, 'moving avg'),
  params: [
    ...parentPipelineAggHelper.params(),
    {
      name: 'window',
      default: 5,
    },
    {
      name: 'script',
      default: 'MovingFunctions.unweightedAvg(values)'
    }
  ],
  getValue(agg, bucket) {
    /**
     * The moving_avg aggregation (that was used originally here) does not return
     * a bucket if the child aggregation doesn't have any documents, and thus
     * we would return 0 via the getValue function in MetricAggType.
     * The moving_fn does return a bucket with the value `null` instead, which would
     * not be converted to 0 by MetricAggType.getValue. To have the same behavior as
     * moving_avg had earlier in Kibana, we will now also convert an existing bucket with
     * the value `null` to 0.
     */
    return bucket[agg.id] ? (bucket[agg.id].value || 0) : 0;
  },
  getFormat: parentPipelineAggHelper.getFormat
});
