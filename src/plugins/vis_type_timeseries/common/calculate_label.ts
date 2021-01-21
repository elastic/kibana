/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { includes, startsWith } from 'lodash';
import { i18n } from '@kbn/i18n';
import { lookup } from './agg_lookup';
import { MetricsItemsSchema, SanitizedFieldType } from './types';

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

export const extractFieldLabel = (fields: SanitizedFieldType[], name: string) => {
  return fields.find((f) => f.name === name)?.label ?? name;
};

export const calculateLabel = (
  metric: MetricsItemsSchema,
  metrics: MetricsItemsSchema[] = [],
  fields: SanitizedFieldType[] = []
): string => {
  if (!metric) {
    return i18n.translate('visTypeTimeseries.calculateLabel.unknownLabel', {
      defaultMessage: 'Unknown',
    });
  }
  if (metric.alias) {
    return metric.alias;
  }

  if (metric.type === 'count') {
    return i18n.translate('visTypeTimeseries.calculateLabel.countLabel', {
      defaultMessage: 'Count',
    });
  }
  if (metric.type === 'calculation') {
    return i18n.translate('visTypeTimeseries.calculateLabel.bucketScriptsLabel', {
      defaultMessage: 'Bucket Script',
    });
  }
  if (metric.type === 'math') {
    return i18n.translate('visTypeTimeseries.calculateLabel.mathLabel', { defaultMessage: 'Math' });
  }
  if (metric.type === 'series_agg') {
    return i18n.translate('visTypeTimeseries.calculateLabel.seriesAggLabel', {
      defaultMessage: 'Series Agg ({metricFunction})',
      values: { metricFunction: metric.function },
    });
  }
  if (metric.type === 'filter_ratio') {
    return i18n.translate('visTypeTimeseries.calculateLabel.filterRatioLabel', {
      defaultMessage: 'Filter Ratio',
    });
  }
  if (metric.type === 'positive_rate') {
    return i18n.translate('visTypeTimeseries.calculateLabel.positiveRateLabel', {
      defaultMessage: 'Counter Rate of {field}',
      values: { field: extractFieldLabel(fields, metric.field!) },
    });
  }
  if (metric.type === 'static') {
    return i18n.translate('visTypeTimeseries.calculateLabel.staticValueLabel', {
      defaultMessage: 'Static Value of {metricValue}',
      values: { metricValue: metric.value },
    });
  }

  if (includes(paths, metric.type)) {
    const targetMetric = metrics.find((m) => startsWith(metric.field!, m.id));
    const targetLabel = calculateLabel(targetMetric!, metrics, fields);

    // For percentiles we need to parse the field id to extract the percentile
    // the user configured in the percentile aggregation and specified in the
    // submetric they selected. This applies only to pipeline aggs.
    if (targetMetric && targetMetric.type === 'percentile') {
      const percentileValueMatch = /\[([0-9\.]+)\]$/;
      const matches = metric.field!.match(percentileValueMatch);
      if (matches) {
        return i18n.translate(
          'visTypeTimeseries.calculateLabel.lookupMetricTypeOfTargetWithAdditionalLabel',
          {
            defaultMessage: '{lookupMetricType} of {targetLabel} ({additionalLabel})',
            values: {
              lookupMetricType: lookup[metric.type],
              targetLabel,
              additionalLabel: matches[1],
            },
          }
        );
      }
    }
    return i18n.translate('visTypeTimeseries.calculateLabel.lookupMetricTypeOfTargetLabel', {
      defaultMessage: '{lookupMetricType} of {targetLabel}',
      values: { lookupMetricType: lookup[metric.type], targetLabel },
    });
  }

  return i18n.translate('visTypeTimeseries.calculateLabel.lookupMetricTypeOfMetricFieldRankLabel', {
    defaultMessage: '{lookupMetricType} of {metricField}',
    values: {
      lookupMetricType: lookup[metric.type],
      metricField: extractFieldLabel(fields, metric.field!),
    },
  });
};
