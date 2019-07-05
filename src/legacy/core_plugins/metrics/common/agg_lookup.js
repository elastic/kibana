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

export const lookup = {
  count: i18n.translate('tsvb.aggLookup.countLabel', { defaultMessage: 'Count' }),
  calculation: i18n.translate('tsvb.aggLookup.calculationLabel', { defaultMessage: 'Calculation' }),
  std_deviation: i18n.translate('tsvb.aggLookup.deviationLabel', {
    defaultMessage: 'Std. Deviation',
  }),
  variance: i18n.translate('tsvb.aggLookup.varianceLabel', { defaultMessage: 'Variance' }),
  sum_of_squares: i18n.translate('tsvb.aggLookup.sumOfSqLabel', { defaultMessage: 'Sum of Sq.' }),
  avg: i18n.translate('tsvb.aggLookup.averageLabel', { defaultMessage: 'Average' }),
  max: i18n.translate('tsvb.aggLookup.maxLabel', { defaultMessage: 'Max' }),
  min: i18n.translate('tsvb.aggLookup.minLabel', { defaultMessage: 'Min' }),
  sum: i18n.translate('tsvb.aggLookup.sumLabel', { defaultMessage: 'Sum' }),
  percentile: i18n.translate('tsvb.aggLookup.percentileLabel', { defaultMessage: 'Percentile' }),
  percentile_rank: i18n.translate('tsvb.aggLookup.percentileRankLabel', {
    defaultMessage: 'Percentile Rank',
  }),
  cardinality: i18n.translate('tsvb.aggLookup.cardinalityLabel', { defaultMessage: 'Cardinality' }),
  value_count: i18n.translate('tsvb.aggLookup.valueCountLabel', { defaultMessage: 'Value Count' }),
  derivative: i18n.translate('tsvb.aggLookup.derivativeLabel', { defaultMessage: 'Derivative' }),
  cumulative_sum: i18n.translate('tsvb.aggLookup.cumulativeSumLabel', {
    defaultMessage: 'Cumulative Sum',
  }),
  moving_average: i18n.translate('tsvb.aggLookup.movingAverageLabel', {
    defaultMessage: 'Moving Average',
  }),
  avg_bucket: i18n.translate('tsvb.aggLookup.overallAverageLabel', {
    defaultMessage: 'Overall Average',
  }),
  min_bucket: i18n.translate('tsvb.aggLookup.overallMinLabel', { defaultMessage: 'Overall Min' }),
  max_bucket: i18n.translate('tsvb.aggLookup.overallMaxLabel', { defaultMessage: 'Overall Max' }),
  sum_bucket: i18n.translate('tsvb.aggLookup.overallSumLabel', { defaultMessage: 'Overall Sum' }),
  variance_bucket: i18n.translate('tsvb.aggLookup.overallVarianceLabel', {
    defaultMessage: 'Overall Variance',
  }),
  sum_of_squares_bucket: i18n.translate('tsvb.aggLookup.overallSumOfSqLabel', {
    defaultMessage: 'Overall Sum of Sq.',
  }),
  std_deviation_bucket: i18n.translate('tsvb.aggLookup.overallStdDeviationLabel', {
    defaultMessage: 'Overall Std. Deviation',
  }),
  series_agg: i18n.translate('tsvb.aggLookup.seriesAggLabel', { defaultMessage: 'Series Agg' }),
  math: i18n.translate('tsvb.aggLookup.mathLabel', { defaultMessage: 'Math' }),
  serial_diff: i18n.translate('tsvb.aggLookup.serialDifferenceLabel', {
    defaultMessage: 'Serial Difference',
  }),
  filter_ratio: i18n.translate('tsvb.aggLookup.filterRatioLabel', {
    defaultMessage: 'Filter Ratio',
  }),
  positive_only: i18n.translate('tsvb.aggLookup.positiveOnlyLabel', {
    defaultMessage: 'Positive Only',
  }),
  static: i18n.translate('tsvb.aggLookup.staticValueLabel', { defaultMessage: 'Static Value' }),
  top_hit: i18n.translate('tsvb.aggLookup.topHitLabel', { defaultMessage: 'Top Hit' }),
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
  metrics: _.pick(lookup, ['count', 'avg', 'min', 'max', 'sum', 'cardinality', 'value_count']),
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
          ? i18n.translate('tsvb.aggLookup.addPipelineAggDescription', {
              defaultMessage: '{label} (use the "+" button to add this pipeline agg)',
              values: { label },
            })
          : label,
        value,
        disabled,
      };
    })
    .value();
}
