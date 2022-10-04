/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Metric, MetricType } from '../../../../common/types';
import { PANEL_TYPES } from '../../../../common/enums';
import { SUPPORTED_METRICS } from '.';

const isMetricValid = (
  metricType: MetricType,
  panelType: PANEL_TYPES,
  field?: string,
  timeRangeMode?: string
) => {
  const metric = SUPPORTED_METRICS[metricType];
  if (!metric) {
    return false;
  }
  const isPanelTypeSupported = metric.supportedPanelTypes.includes(panelType);
  const isTimeRangeModeSupported =
    !timeRangeMode || (metric.supportedTimeRangeModes as string[]).includes(timeRangeMode);
  return isPanelTypeSupported && isTimeRangeModeSupported && (!metric.isFieldRequired || field);
};

export const isValidMetrics = (
  metrics: Metric[],
  panelType: PANEL_TYPES,
  timeRangeMode?: string
) => {
  return metrics.every((metric) => {
    const isMetricAggValid =
      metric.type !== 'filter_ratio' ||
      isMetricValid(
        (metric.metric_agg as MetricType) || 'count',
        panelType,
        metric.field,
        timeRangeMode
      );
    return (
      metric.type === 'series_agg' ||
      (isMetricValid(metric.type, panelType, metric.field, timeRangeMode) && isMetricAggValid)
    );
  });
};
