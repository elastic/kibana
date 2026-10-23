/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricsGridSettings } from '@kbn/discover-utils';
import type {
  MetricAggregationConfigChangedEvent,
  MetricAggregationConfigMetricType,
} from '../../observability/metrics/telemetry';

const SETTINGS_BY_METRIC_TYPE: Record<
  MetricAggregationConfigMetricType,
  {
    aggregation: 'counterAggregation' | 'gaugeAggregation' | 'histogramPercentile';
    visualization?: 'histogramVisualization';
  }
> = {
  counter: { aggregation: 'counterAggregation' },
  gauge: { aggregation: 'gaugeAggregation' },
  histogram: { aggregation: 'histogramPercentile', visualization: 'histogramVisualization' },
};

export const getAggregationConfigChanges = (
  gridSettings: MetricsGridSettings,
  update: Partial<MetricsGridSettings>
): MetricAggregationConfigChangedEvent[] =>
  (
    Object.entries(SETTINGS_BY_METRIC_TYPE) as Array<
      [
        MetricAggregationConfigMetricType,
        (typeof SETTINGS_BY_METRIC_TYPE)[MetricAggregationConfigMetricType]
      ]
    >
  ).flatMap(([metricType, { aggregation, visualization }]) => {
    if (
      update[aggregation] === undefined &&
      (!visualization || update[visualization] === undefined)
    ) {
      return [];
    }

    return [
      {
        metric_type: metricType,
        previous_aggregation: gridSettings[aggregation],
        new_aggregation: update[aggregation] ?? gridSettings[aggregation],
        ...(visualization && {
          previous_visualization: gridSettings[visualization],
          new_visualization: update[visualization] ?? gridSettings[visualization],
        }),
      },
    ];
  });
