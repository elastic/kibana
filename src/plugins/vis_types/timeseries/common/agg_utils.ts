/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { filter } from 'lodash';
import { Assign } from 'utility-types';
import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { TSVB_METRIC_TYPES } from './enums';
import type { Metric, MetricType } from './types';

export enum AGG_TYPE {
  METRIC = 'metric',
  PARENT_PIPELINE = 'parent_pipeline',
  SIBLING_PIPELINE = 'sibling_pipeline',
  SPECIAL = 'special',
}

export interface Agg {
  id: MetricType;
  meta: {
    type: AGG_TYPE;
    label: string;
    isFieldRequired: boolean;
    isFilterRatioSupported: boolean;
    isHistogramSupported: boolean;
    isFieldFormattingDisabled: boolean;
    hasExtendedStats: boolean;
  };
}

const aggDefaultMeta = {
  type: AGG_TYPE.METRIC,
  isFieldRequired: true,
  isFilterRatioSupported: false,
  isHistogramSupported: false,
  isFieldFormattingDisabled: false,
  hasExtendedStats: false,
};

export const aggs: Agg[] = [
  {
    id: METRIC_TYPES.AVG,
    meta: {
      ...aggDefaultMeta,
      isFilterRatioSupported: true,
      isHistogramSupported: true,
      label: i18n.translate('visTypeTimeseries.aggUtils.averageLabel', {
        defaultMessage: 'Average',
      }),
    },
  },
  {
    id: METRIC_TYPES.CARDINALITY,
    meta: {
      ...aggDefaultMeta,
      isFilterRatioSupported: true,
      label: i18n.translate('visTypeTimeseries.aggUtils.cardinalityLabel', {
        defaultMessage: 'Cardinality',
      }),
    },
  },
  {
    id: METRIC_TYPES.COUNT,
    meta: {
      ...aggDefaultMeta,
      isFieldRequired: false,
      isFilterRatioSupported: true,
      isHistogramSupported: true,
      label: i18n.translate('visTypeTimeseries.aggUtils.countLabel', { defaultMessage: 'Count' }),
    },
  },
  {
    id: TSVB_METRIC_TYPES.FILTER_RATIO,
    meta: {
      ...aggDefaultMeta,
      isFieldRequired: false,
      label: i18n.translate('visTypeTimeseries.aggUtils.filterRatioLabel', {
        defaultMessage: 'Filter Ratio',
      }),
    },
  },
  {
    id: TSVB_METRIC_TYPES.POSITIVE_RATE,
    meta: {
      ...aggDefaultMeta,
      isFilterRatioSupported: true,
      label: i18n.translate('visTypeTimeseries.aggUtils.positiveRateLabel', {
        defaultMessage: 'Counter Rate',
      }),
    },
  },
  {
    id: METRIC_TYPES.MAX,
    meta: {
      ...aggDefaultMeta,
      isFilterRatioSupported: true,
      isHistogramSupported: true,
      label: i18n.translate('visTypeTimeseries.aggUtils.maxLabel', { defaultMessage: 'Max' }),
    },
  },
  {
    id: METRIC_TYPES.MIN,
    meta: {
      ...aggDefaultMeta,
      isFilterRatioSupported: true,
      isHistogramSupported: true,
      label: i18n.translate('visTypeTimeseries.aggUtils.minLabel', { defaultMessage: 'Min' }),
    },
  },
  {
    id: TSVB_METRIC_TYPES.PERCENTILE,
    meta: {
      ...aggDefaultMeta,
      label: i18n.translate('visTypeTimeseries.aggUtils.percentileLabel', {
        defaultMessage: 'Percentile',
      }),
    },
  },
  {
    id: TSVB_METRIC_TYPES.PERCENTILE_RANK,
    meta: {
      ...aggDefaultMeta,
      label: i18n.translate('visTypeTimeseries.aggUtils.percentileRankLabel', {
        defaultMessage: 'Percentile Rank',
      }),
    },
  },
  {
    id: TSVB_METRIC_TYPES.STATIC,
    meta: {
      ...aggDefaultMeta,
      isFieldRequired: false,
      label: i18n.translate('visTypeTimeseries.aggUtils.staticValueLabel', {
        defaultMessage: 'Static Value',
      }),
    },
  },
  {
    id: TSVB_METRIC_TYPES.STD_DEVIATION,
    meta: {
      ...aggDefaultMeta,
      hasExtendedStats: true,
      label: i18n.translate('visTypeTimeseries.aggUtils.deviationLabel', {
        defaultMessage: 'Std. Deviation',
      }),
    },
  },
  {
    id: METRIC_TYPES.SUM,
    meta: {
      ...aggDefaultMeta,
      isFilterRatioSupported: true,
      isHistogramSupported: true,
      label: i18n.translate('visTypeTimeseries.aggUtils.sumLabel', { defaultMessage: 'Sum' }),
    },
  },
  {
    id: TSVB_METRIC_TYPES.SUM_OF_SQUARES,
    meta: {
      ...aggDefaultMeta,
      hasExtendedStats: true,
      label: i18n.translate('visTypeTimeseries.aggUtils.sumOfSquaresLabel', {
        defaultMessage: 'Sum of Squares',
      }),
    },
  },
  {
    id: TSVB_METRIC_TYPES.TOP_HIT,
    meta: {
      ...aggDefaultMeta,
      label: i18n.translate('visTypeTimeseries.aggUtils.topHitLabel', {
        defaultMessage: 'Top Hit',
      }),
    },
  },
  {
    id: TSVB_METRIC_TYPES.VALUE_COUNT,
    meta: {
      ...aggDefaultMeta,
      isFilterRatioSupported: true,
      isHistogramSupported: true,
      label: i18n.translate('visTypeTimeseries.aggUtils.valueCountLabel', {
        defaultMessage: 'Value Count',
      }),
    },
  },
  {
    id: TSVB_METRIC_TYPES.VARIANCE,
    meta: {
      ...aggDefaultMeta,
      hasExtendedStats: true,
      label: i18n.translate('visTypeTimeseries.aggUtils.varianceLabel', {
        defaultMessage: 'Variance',
      }),
    },
  },
  {
    id: TSVB_METRIC_TYPES.CALCULATION,
    meta: {
      ...aggDefaultMeta,
      isFieldFormattingDisabled: true,
      type: AGG_TYPE.PARENT_PIPELINE,
      label: i18n.translate('visTypeTimeseries.aggUtils.bucketScriptLabel', {
        defaultMessage: 'Bucket Script',
      }),
    },
  },
  {
    id: METRIC_TYPES.CUMULATIVE_SUM,
    meta: {
      ...aggDefaultMeta,
      type: AGG_TYPE.PARENT_PIPELINE,
      label: i18n.translate('visTypeTimeseries.aggUtils.cumulativeSumLabel', {
        defaultMessage: 'Cumulative Sum',
      }),
    },
  },
  {
    id: METRIC_TYPES.DERIVATIVE,
    meta: {
      ...aggDefaultMeta,
      type: AGG_TYPE.PARENT_PIPELINE,
      label: i18n.translate('visTypeTimeseries.aggUtils.derivativeLabel', {
        defaultMessage: 'Derivative',
      }),
    },
  },
  {
    id: TSVB_METRIC_TYPES.MOVING_AVERAGE,
    meta: {
      ...aggDefaultMeta,
      type: AGG_TYPE.PARENT_PIPELINE,
      label: i18n.translate('visTypeTimeseries.aggUtils.movingAverageLabel', {
        defaultMessage: 'Moving Average',
      }),
    },
  },
  {
    id: TSVB_METRIC_TYPES.POSITIVE_ONLY,
    meta: {
      ...aggDefaultMeta,
      type: AGG_TYPE.PARENT_PIPELINE,
      label: i18n.translate('visTypeTimeseries.aggUtils.positiveOnlyLabel', {
        defaultMessage: 'Positive Only',
      }),
    },
  },
  {
    id: METRIC_TYPES.SERIAL_DIFF,
    meta: {
      ...aggDefaultMeta,
      type: AGG_TYPE.PARENT_PIPELINE,
      label: i18n.translate('visTypeTimeseries.aggUtils.serialDifferenceLabel', {
        defaultMessage: 'Serial Difference',
      }),
    },
  },
  {
    id: METRIC_TYPES.AVG_BUCKET,
    meta: {
      ...aggDefaultMeta,
      type: AGG_TYPE.SIBLING_PIPELINE,
      label: i18n.translate('visTypeTimeseries.aggUtils.overallAverageLabel', {
        defaultMessage: 'Overall Average',
      }),
    },
  },
  {
    id: METRIC_TYPES.MAX_BUCKET,
    meta: {
      ...aggDefaultMeta,
      type: AGG_TYPE.SIBLING_PIPELINE,
      label: i18n.translate('visTypeTimeseries.aggUtils.overallMaxLabel', {
        defaultMessage: 'Overall Max',
      }),
    },
  },
  {
    id: METRIC_TYPES.MIN_BUCKET,
    meta: {
      ...aggDefaultMeta,
      type: AGG_TYPE.SIBLING_PIPELINE,
      label: i18n.translate('visTypeTimeseries.aggUtils.overallMinLabel', {
        defaultMessage: 'Overall Min',
      }),
    },
  },
  {
    id: TSVB_METRIC_TYPES.STD_DEVIATION_BUCKET,
    meta: {
      ...aggDefaultMeta,
      type: AGG_TYPE.SIBLING_PIPELINE,
      label: i18n.translate('visTypeTimeseries.aggUtils.overallStdDeviationLabel', {
        defaultMessage: 'Overall Std. Deviation',
      }),
    },
  },
  {
    id: METRIC_TYPES.SUM_BUCKET,
    meta: {
      ...aggDefaultMeta,
      type: AGG_TYPE.SIBLING_PIPELINE,
      label: i18n.translate('visTypeTimeseries.aggUtils.overallSumLabel', {
        defaultMessage: 'Overall Sum',
      }),
    },
  },
  {
    id: TSVB_METRIC_TYPES.SUM_OF_SQUARES_BUCKET,
    meta: {
      ...aggDefaultMeta,
      type: AGG_TYPE.SIBLING_PIPELINE,
      label: i18n.translate('visTypeTimeseries.aggUtils.overallSumOfSquaresLabel', {
        defaultMessage: 'Overall Sum of Squares',
      }),
    },
  },
  {
    id: TSVB_METRIC_TYPES.VARIANCE_BUCKET,
    meta: {
      ...aggDefaultMeta,
      type: AGG_TYPE.SIBLING_PIPELINE,
      label: i18n.translate('visTypeTimeseries.aggUtils.overallVarianceLabel', {
        defaultMessage: 'Overall Variance',
      }),
    },
  },
  {
    id: TSVB_METRIC_TYPES.SERIES_AGG,
    meta: {
      ...aggDefaultMeta,
      type: AGG_TYPE.SPECIAL,
      isFieldRequired: false,
      label: i18n.translate('visTypeTimeseries.aggUtils.seriesAggLabel', {
        defaultMessage: 'Series Agg',
      }),
    },
  },
  {
    id: TSVB_METRIC_TYPES.MATH,
    meta: {
      ...aggDefaultMeta,
      isFieldFormattingDisabled: true,
      type: AGG_TYPE.SPECIAL,
      label: i18n.translate('visTypeTimeseries.aggUtils.mathLabel', { defaultMessage: 'Math' }),
    },
  },
];

export const getAggsByPredicate = (
  predicate: Assign<Partial<Agg>, { meta?: Partial<Agg['meta']> }>
) => filter(aggs, predicate) as Agg[];

export const getAggByPredicate = (metricType: MetricType, metaPredicate?: Partial<Agg['meta']>) => {
  const predicate = {
    id: metricType,
    ...(metaPredicate && {
      meta: metaPredicate,
    }),
  };
  return getAggsByPredicate(predicate)[0];
};

export const getMetricLabel = (metricType: MetricType) => getAggByPredicate(metricType)?.meta.label;

export const isBasicAgg = (metric: Metric) =>
  Boolean(getAggByPredicate(metric.type, { type: AGG_TYPE.METRIC }));

export const getAggsByType = <TMapValue = unknown>(mapFn: (agg: Agg) => TMapValue) =>
  aggs.reduce(
    (acc, agg) => {
      acc[agg.meta.type].push(mapFn(agg));
      return acc;
    },
    {
      [AGG_TYPE.METRIC]: [],
      [AGG_TYPE.PARENT_PIPELINE]: [],
      [AGG_TYPE.SIBLING_PIPELINE]: [],
      [AGG_TYPE.SPECIAL]: [],
    } as Record<AGG_TYPE, TMapValue[]>
  );
