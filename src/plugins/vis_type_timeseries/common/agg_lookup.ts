/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { omit, pick, includes } from 'lodash';
import { i18n } from '@kbn/i18n';
import { MetricsItemsSchema } from './types';

export const lookup: Record<string, string> = {
  count: i18n.translate('visTypeTimeseries.aggLookup.countLabel', { defaultMessage: 'Count' }),
  calculation: i18n.translate('visTypeTimeseries.aggLookup.calculationLabel', {
    defaultMessage: 'Calculation',
  }),
  std_deviation: i18n.translate('visTypeTimeseries.aggLookup.deviationLabel', {
    defaultMessage: 'Std. Deviation',
  }),
  variance: i18n.translate('visTypeTimeseries.aggLookup.varianceLabel', {
    defaultMessage: 'Variance',
  }),
  sum_of_squares: i18n.translate('visTypeTimeseries.aggLookup.sumOfSqLabel', {
    defaultMessage: 'Sum of Sq.',
  }),
  avg: i18n.translate('visTypeTimeseries.aggLookup.averageLabel', { defaultMessage: 'Average' }),
  max: i18n.translate('visTypeTimeseries.aggLookup.maxLabel', { defaultMessage: 'Max' }),
  min: i18n.translate('visTypeTimeseries.aggLookup.minLabel', { defaultMessage: 'Min' }),
  sum: i18n.translate('visTypeTimeseries.aggLookup.sumLabel', { defaultMessage: 'Sum' }),
  percentile: i18n.translate('visTypeTimeseries.aggLookup.percentileLabel', {
    defaultMessage: 'Percentile',
  }),
  percentile_rank: i18n.translate('visTypeTimeseries.aggLookup.percentileRankLabel', {
    defaultMessage: 'Percentile Rank',
  }),
  cardinality: i18n.translate('visTypeTimeseries.aggLookup.cardinalityLabel', {
    defaultMessage: 'Cardinality',
  }),
  value_count: i18n.translate('visTypeTimeseries.aggLookup.valueCountLabel', {
    defaultMessage: 'Value Count',
  }),
  derivative: i18n.translate('visTypeTimeseries.aggLookup.derivativeLabel', {
    defaultMessage: 'Derivative',
  }),
  cumulative_sum: i18n.translate('visTypeTimeseries.aggLookup.cumulativeSumLabel', {
    defaultMessage: 'Cumulative Sum',
  }),
  moving_average: i18n.translate('visTypeTimeseries.aggLookup.movingAverageLabel', {
    defaultMessage: 'Moving Average',
  }),
  avg_bucket: i18n.translate('visTypeTimeseries.aggLookup.overallAverageLabel', {
    defaultMessage: 'Overall Average',
  }),
  min_bucket: i18n.translate('visTypeTimeseries.aggLookup.overallMinLabel', {
    defaultMessage: 'Overall Min',
  }),
  max_bucket: i18n.translate('visTypeTimeseries.aggLookup.overallMaxLabel', {
    defaultMessage: 'Overall Max',
  }),
  sum_bucket: i18n.translate('visTypeTimeseries.aggLookup.overallSumLabel', {
    defaultMessage: 'Overall Sum',
  }),
  variance_bucket: i18n.translate('visTypeTimeseries.aggLookup.overallVarianceLabel', {
    defaultMessage: 'Overall Variance',
  }),
  sum_of_squares_bucket: i18n.translate('visTypeTimeseries.aggLookup.overallSumOfSqLabel', {
    defaultMessage: 'Overall Sum of Sq.',
  }),
  std_deviation_bucket: i18n.translate('visTypeTimeseries.aggLookup.overallStdDeviationLabel', {
    defaultMessage: 'Overall Std. Deviation',
  }),
  series_agg: i18n.translate('visTypeTimeseries.aggLookup.seriesAggLabel', {
    defaultMessage: 'Series Agg',
  }),
  math: i18n.translate('visTypeTimeseries.aggLookup.mathLabel', { defaultMessage: 'Math' }),
  serial_diff: i18n.translate('visTypeTimeseries.aggLookup.serialDifferenceLabel', {
    defaultMessage: 'Serial Difference',
  }),
  filter_ratio: i18n.translate('visTypeTimeseries.aggLookup.filterRatioLabel', {
    defaultMessage: 'Filter Ratio',
  }),
  positive_only: i18n.translate('visTypeTimeseries.aggLookup.positiveOnlyLabel', {
    defaultMessage: 'Positive Only',
  }),
  static: i18n.translate('visTypeTimeseries.aggLookup.staticValueLabel', {
    defaultMessage: 'Static Value',
  }),
  top_hit: i18n.translate('visTypeTimeseries.aggLookup.topHitLabel', { defaultMessage: 'Top Hit' }),
  positive_rate: i18n.translate('visTypeTimeseries.aggLookup.positiveRateLabel', {
    defaultMessage: 'Counter Rate',
  }),
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
  pipeline,
  basic: omit(lookup, pipeline),
  metrics: pick(lookup, ['count', 'avg', 'min', 'max', 'sum', 'cardinality', 'value_count']),
};

export function isBasicAgg(item: MetricsItemsSchema) {
  return includes(Object.keys(byType.basic), item.type);
}
