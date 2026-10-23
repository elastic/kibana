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

type AggregationSetting = 'counterAggregation' | 'gaugeAggregation';

const METRIC_TYPE_BY_SETTING: Record<AggregationSetting, MetricAggregationConfigMetricType> = {
  counterAggregation: 'counter',
  gaugeAggregation: 'gauge',
};

export const getAggregationConfigChanges = (
  gridSettings: MetricsGridSettings,
  update: Partial<MetricsGridSettings>
): MetricAggregationConfigChangedEvent[] => {
  const events: MetricAggregationConfigChangedEvent[] = (
    Object.keys(METRIC_TYPE_BY_SETTING) as AggregationSetting[]
  ).flatMap((setting) => {
    const newAggregation = update[setting];

    if (newAggregation === undefined) {
      return [];
    }

    return [
      {
        metric_type: METRIC_TYPE_BY_SETTING[setting],
        previous_aggregation: gridSettings[setting],
        new_aggregation: newAggregation,
      },
    ];
  });

  const previousAggregation = gridSettings.histogramPercentile;
  const nextAggregation = update.histogramPercentile ?? previousAggregation;
  const previousVisualization = gridSettings.histogramVisualization;
  const nextVisualization = update.histogramVisualization ?? previousVisualization;
  const histogramChanged =
    (update.histogramPercentile !== undefined || update.histogramVisualization !== undefined) &&
    (nextAggregation !== previousAggregation || nextVisualization !== previousVisualization);

  if (histogramChanged) {
    events.push({
      metric_type: 'histogram',
      previous_aggregation: previousAggregation,
      new_aggregation: nextAggregation,
      previous_visualization: previousVisualization,
      new_visualization: nextVisualization,
    });
  }

  return events;
};
