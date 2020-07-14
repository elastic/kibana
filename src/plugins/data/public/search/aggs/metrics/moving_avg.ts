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

import { i18n } from '@kbn/i18n';
import { MetricAggType } from './metric_agg_type';
import { parentPipelineAggHelper } from './lib/parent_pipeline_agg_helper';
import { makeNestedLabel } from './lib/make_nested_label';
import { METRIC_TYPES } from './metric_agg_types';
import { AggConfigSerialized, BaseAggParams } from '../types';

export interface AggParamsMovingAvg extends BaseAggParams {
  buckets_path: string;
  window?: number;
  script?: string;
  customMetric?: AggConfigSerialized;
  metricAgg?: string;
}

const movingAvgTitle = i18n.translate('data.search.aggs.metrics.movingAvgTitle', {
  defaultMessage: 'Moving Avg',
});

const movingAvgLabel = i18n.translate('data.search.aggs.metrics.movingAvgLabel', {
  defaultMessage: 'moving avg',
});

export const getMovingAvgMetricAgg = () => {
  const { subtype, params, getSerializedFormat } = parentPipelineAggHelper;

  return new MetricAggType({
    name: METRIC_TYPES.MOVING_FN,
    dslName: 'moving_fn',
    title: movingAvgTitle,
    makeLabel: (agg) => makeNestedLabel(agg, movingAvgLabel),
    subtype,
    getSerializedFormat,
    params: [
      ...params(),
      {
        name: 'window',
        default: 5,
      },
      {
        name: 'script',
        default: 'MovingFunctions.unweightedAvg(values)',
      },
    ],
    getValue(agg, bucket) {
      /**
       * The previous implementation using `moving_avg` did not
       * return any bucket in case there are no documents or empty window.
       * The `moving_fn` aggregation returns buckets with the value null if the
       * window is empty or doesn't return any value if the sibiling metric
       * is null. Since our generic MetricAggType.getValue implementation
       * would return the value 0 for null buckets, we need a specific
       * implementation here, that preserves the null value.
       */
      return bucket[agg.id] ? bucket[agg.id].value : null;
    },
  });
};
