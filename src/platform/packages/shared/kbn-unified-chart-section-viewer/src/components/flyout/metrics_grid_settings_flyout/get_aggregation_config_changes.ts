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
): MetricAggregationConfigChangedEvent[] => {
  return (Object.keys(SETTINGS_BY_METRIC_TYPE) as MetricAggregationConfigMetricType[]).flatMap(
    (metricType) => {
      const { aggregation, visualization } = SETTINGS_BY_METRIC_TYPE[metricType];
      const previousAggregation = gridSettings[aggregation];
      const newAggregation = update[aggregation] ?? previousAggregation;
      const previousVisualization = visualization ? gridSettings[visualization] : undefined;
      const newVisualization = visualization
        ? update[visualization] ?? previousVisualization
        : undefined;
      const changed =
        newAggregation !== previousAggregation ||
        (visualization !== undefined && newVisualization !== previousVisualization);

      if (!changed) {
        return [];
      }

      return [
        {
          metric_type: metricType,
          previous_aggregation: previousAggregation,
          new_aggregation: newAggregation,
          ...(visualization !== undefined && {
            previous_visualization: previousVisualization,
            new_visualization: newVisualization,
          }),
        },
      ];
    }
  );
};
