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
const lookup = {
  count: 'Count',
  calculation: 'Calculation',
  std_deviation: 'Std. Deviation',
  variance: 'Variance',
  sum_of_squares: 'Sum of Sq.',
  avg: 'Average',
  max: 'Max',
  min: 'Min',
  sum: 'Sum',
  percentile: 'Percentile',
  percentile_rank: 'Percentile Rank',
  cardinality: 'Cardinality',
  value_count: 'Value Count',
  derivative: 'Derivative',
  cumulative_sum: 'Cumulative Sum',
  moving_average: 'Moving Average',
  avg_bucket: 'Overall Average',
  min_bucket: 'Overall Min',
  max_bucket: 'Overall Max',
  sum_bucket: 'Overall Sum',
  variance_bucket: 'Overall Variance',
  sum_of_squares_bucket: 'Overall Sum of Sq.',
  std_deviation_bucket: 'Overall Std. Deviation',
  series_agg: 'Series Agg',
  math: 'Math',
  serial_diff: 'Serial Difference',
  filter_ratio: 'Filter Ratio',
  positive_only: 'Positive Only',
  static: 'Static Value',
  top_hit: 'Top Hit',
};

const pipeline = [
  'calculation',
  'derivative',
  'cumulative_sum',
  'moving_average',
  'avg_bucket',
  'min_bucket',
  'max_bucket',
  'sum_bucket',
  'variance_bucket',
  'sum_of_squares_bucket',
  'std_deviation_bucket',
  'series_agg',
  'math',
  'serial_diff',
  'positive_only',
];

const byType = {
  _all: lookup,
  pipeline: pipeline,
  basic: _.omit(lookup, pipeline),
  metrics: _.pick(lookup, [
    'count',
    'avg',
    'min',
    'max',
    'sum',
    'cardinality',
    'value_count',
  ]),
};

export function isBasicAgg(item) {
  return _.includes(Object.keys(byType.basic), item.type);
}

export function createOptions(type = '_all', siblings = []) {
  let aggs = byType[type];
  if (!aggs) aggs = byType._all;
  let enablePipelines = siblings.some(isBasicAgg);
  if (siblings.length <= 1) enablePipelines = false;
  return _(aggs)
    .map((label, value) => {
      const disabled = _.includes(pipeline, value) ? !enablePipelines : false;
      return {
        label: disabled
          ? `${label} (use the "+" button to add this pipeline agg)`
          : label,
        value,
        disabled,
      };
    })
    .value();
}

export default lookup;
