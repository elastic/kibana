/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MappingTimeSeriesMetricType } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import type {
  HistogramPercentile,
  MetricsGridSettings,
  SimpleAggregation,
} from '@kbn/discover-utils';

/**
 * Short display labels for `SimpleAggregation` values, used where space is
 * constrained (e.g. the chart y-axis title).
 */
const AGGREGATION_LABELS: Record<SimpleAggregation, string> = {
  avg: i18n.translate('metricsExperience.aggregationLabel.avg', { defaultMessage: 'Avg' }),
  sum: i18n.translate('metricsExperience.aggregationLabel.sum', { defaultMessage: 'Sum' }),
  min: i18n.translate('metricsExperience.aggregationLabel.min', { defaultMessage: 'Min' }),
  max: i18n.translate('metricsExperience.aggregationLabel.max', { defaultMessage: 'Max' }),
};

const PERCENTILE_LABELS: Record<HistogramPercentile, string> = {
  p50: i18n.translate('metricsExperience.aggregationLabel.p50', {
    defaultMessage: '50th percentile',
  }),
  p75: i18n.translate('metricsExperience.aggregationLabel.p75', {
    defaultMessage: '75th percentile',
  }),
  p90: i18n.translate('metricsExperience.aggregationLabel.p90', {
    defaultMessage: '90th percentile',
  }),
  p95: i18n.translate('metricsExperience.aggregationLabel.p95', {
    defaultMessage: '95th percentile',
  }),
  p99: i18n.translate('metricsExperience.aggregationLabel.p99', {
    defaultMessage: '99th percentile',
  }),
};

/**
 * Returns a short display label for the effective aggregation of a metric
 * based on the grid settings. Returns an empty string when no settings are provided.
 */
export const getAggregationLabel = ({
  instrument,
  customFunction,
  gridSettings,
}: {
  instrument: MappingTimeSeriesMetricType;
  customFunction?: string;
  gridSettings?: MetricsGridSettings;
}): string => {
  if (!gridSettings) return '';
  if (customFunction) return customFunction;

  if (instrument === 'histogram') {
    return PERCENTILE_LABELS[gridSettings.histogramPercentile];
  }

  return AGGREGATION_LABELS[
    instrument === 'counter' ? gridSettings.counterAggregation : gridSettings.gaugeAggregation
  ];
};
