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
import { i18n } from '@kbn/i18n';

const lookup = {
  count: i18n.translate('metrics.lookup.countLabel', { defaultMessage: 'Count' }),
  calculation: i18n.translate('metrics.lookup.calculationLabel', { defaultMessage: 'Calculation' }),
  std_deviation: i18n.translate('metrics.lookup.deviationLabel', { defaultMessage: 'Std. Deviation' }),
  variance: i18n.translate('metrics.lookup.varianceLabel', { defaultMessage: 'Variance' }),
  sum_of_squares: i18n.translate('metrics.lookup.sumOfSqLabel', { defaultMessage: 'Sum of Sq.' }),
  avg: i18n.translate('metrics.lookup.averageLabel', { defaultMessage: 'Average' }),
  max: i18n.translate('metrics.lookup.maxLabel', { defaultMessage: 'Max' }),
  min: i18n.translate('metrics.lookup.minLabel', { defaultMessage: 'Min' }),
  sum: i18n.translate('metrics.lookup.sumLabel', { defaultMessage: 'Sum' }),
  percentile: i18n.translate('metrics.lookup.percentileLabel', { defaultMessage: 'Percentile' }),
  percentile_rank: i18n.translate('metrics.lookup.percentileRankLabel', { defaultMessage: 'Percentile Rank' }),
  cardinality: i18n.translate('metrics.lookup.cardinalityLabel', { defaultMessage: 'Cardinality' }),
  value_count: i18n.translate('metrics.lookup.valueCountLabel', { defaultMessage: 'Value Count' }),
  derivative: i18n.translate('metrics.lookup.derivativeLabel', { defaultMessage: 'Derivative' }),
  cumulative_sum: i18n.translate('metrics.lookup.cumulativeSumLabel', { defaultMessage: 'Cumulative' }),
  moving_average: i18n.translate('metrics.lookup.movingAverageLabel', { defaultMessage: 'Moving Average' }),
  avg_bucket: i18n.translate('metrics.lookup.overallAverageLabel', { defaultMessage: 'Overall Average' }),
  min_bucket: i18n.translate('metrics.lookup.overallMinLabel', { defaultMessage: 'Overall Min' }),
  max_bucket: i18n.translate('metrics.lookup.overallMaxLabel', { defaultMessage: 'Overall Max' }),
  sum_bucket: i18n.translate('metrics.lookup.overallSumLabel', { defaultMessage: 'Overall Sum' }),
  variance_bucket: i18n.translate('metrics.lookup.overallVarianceLabel', { defaultMessage: 'Overall Variance' }),
  sum_of_squares_bucket: i18n.translate('metrics.lookup.overallSumOfSqLabel', { defaultMessage: 'Overall Sum of Sq.' }),
  std_deviation_bucket: i18n.translate('metrics.lookup.overallStdDeviationLabel', { defaultMessage: 'Overall Std. Deviation' }),
  series_agg: i18n.translate('metrics.lookup.seriesAggLabel', { defaultMessage: 'Series Agg' }),
  math: i18n.translate('metrics.lookup.mathLabel', { defaultMessage: 'Math' }),
  serial_diff: i18n.translate('metrics.lookup.serialDifferenceLabel', { defaultMessage: 'Serial Difference' }),
  filter_ratio: i18n.translate('metrics.lookup.filterRatioLabel', { defaultMessage: 'Filter Ratio' }),
  positive_only: i18n.translate('metrics.lookup.positiveOnlyLabel', { defaultMessage: 'Positive Only' }),
  static: i18n.translate('metrics.lookup.staticValueLabel', { defaultMessage: 'Static Value' }),
  top_hit: i18n.translate('metrics.lookup.topHitLabel', { defaultMessage: 'Top Hit' }),
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
