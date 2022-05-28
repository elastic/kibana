/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { includes, startsWith } from 'lodash';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { getMetricLabel } from './agg_utils';
import { extractFieldLabel } from './fields_utils';
import { TSVB_METRIC_TYPES } from './enums';
import type { Metric, SanitizedFieldType } from './types';

const paths = [
  'cumulative_sum',
  'derivative',
  'moving_average',
  'avg_bucket',
  'sum_bucket',
  'min_bucket',
  'max_bucket',
  'std_deviation_bucket',
  'variance_bucket',
  'sum_of_squares_bucket',
  'serial_diff',
  'positive_only',
];

export const calculateLabel = (
  metric: Metric,
  metrics: Metric[] = [],
  fields: SanitizedFieldType[] = [],
  isThrowErrorOnFieldNotFound: boolean = true
): string => {
  if (!metric) {
    return i18n.translate('visTypeTimeseries.calculateLabel.unknownLabel', {
      defaultMessage: 'Unknown',
    });
  }
  if (metric.alias) {
    return metric.alias;
  }

  switch (metric.type) {
    case METRIC_TYPES.COUNT:
      return i18n.translate('visTypeTimeseries.calculateLabel.countLabel', {
        defaultMessage: 'Count',
      });
    case TSVB_METRIC_TYPES.CALCULATION:
      return i18n.translate('visTypeTimeseries.calculateLabel.bucketScriptsLabel', {
        defaultMessage: 'Bucket Script',
      });
    case TSVB_METRIC_TYPES.MATH:
      return i18n.translate('visTypeTimeseries.calculateLabel.mathLabel', {
        defaultMessage: 'Math',
      });
    case TSVB_METRIC_TYPES.SERIES_AGG:
      return i18n.translate('visTypeTimeseries.calculateLabel.seriesAggLabel', {
        defaultMessage: 'Series Agg ({metricFunction})',
        values: { metricFunction: metric.function },
      });
    case TSVB_METRIC_TYPES.FILTER_RATIO:
      return i18n.translate('visTypeTimeseries.calculateLabel.filterRatioLabel', {
        defaultMessage: 'Filter Ratio',
      });
    case TSVB_METRIC_TYPES.POSITIVE_RATE:
      return i18n.translate('visTypeTimeseries.calculateLabel.positiveRateLabel', {
        defaultMessage: 'Counter Rate of {field}',
        values: { field: extractFieldLabel(fields, metric.field!, isThrowErrorOnFieldNotFound) },
      });
    case TSVB_METRIC_TYPES.STATIC:
      return i18n.translate('visTypeTimeseries.calculateLabel.staticValueLabel', {
        defaultMessage: 'Static Value of {metricValue}',
        values: { metricValue: metric.value },
      });
  }

  const metricTypeLabel = getMetricLabel(metric.type);

  if (includes(paths, metric.type)) {
    const targetMetric = metrics.find((m) => startsWith(metric.field!, m.id));
    const targetLabel = calculateLabel(targetMetric!, metrics, fields, isThrowErrorOnFieldNotFound);

    // For percentiles we need to parse the field id to extract the percentile
    // the user configured in the percentile aggregation and specified in the
    // submetric they selected. This applies only to pipeline aggs.
    if (targetMetric && targetMetric.type === 'percentile') {
      const percentileValueMatch = /\[([0-9\.]+)\]$/;
      const matches = metric.field!.match(percentileValueMatch);
      if (matches) {
        return i18n.translate(
          'visTypeTimeseries.calculateLabel.metricTypeOfTargetWithAdditionalLabel',
          {
            defaultMessage: '{metricTypeLabel} of {targetLabel} ({additionalLabel})',
            values: {
              metricTypeLabel,
              targetLabel,
              additionalLabel: matches[1],
            },
          }
        );
      }
    }
    return i18n.translate('visTypeTimeseries.calculateLabel.metricTypeOfTargetLabel', {
      defaultMessage: '{metricTypeLabel} of {targetLabel}',
      values: { metricTypeLabel, targetLabel },
    });
  }

  return i18n.translate('visTypeTimeseries.calculateLabel.metricTypeOfMetricFieldRankLabel', {
    defaultMessage: '{metricTypeLabel} of {metricField}',
    values: {
      metricTypeLabel,
      metricField: extractFieldLabel(fields, metric.field!, isThrowErrorOnFieldNotFound),
    },
  });
};
