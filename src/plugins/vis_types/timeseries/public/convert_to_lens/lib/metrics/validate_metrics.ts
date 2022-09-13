/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Metric } from '../../../../common/types';
import { SUPPORTED_METRICS } from '.';

const isMetricValid = (
  metricType: string,
  panelType: string,
  field?: string,
  timeRangeMode?: string
) => {
  const isMetricSupported = SUPPORTED_METRICS[metricType];
  if (!isMetricSupported) {
    return false;
  }
  const isPanelTypeSupported =
    SUPPORTED_METRICS[metricType].supportedPanelTypes.includes(panelType);
  const isTimeRangeModeSupported =
    !timeRangeMode || SUPPORTED_METRICS[metricType].supportedTimeRangeModes.includes(timeRangeMode);
  return (
    isPanelTypeSupported &&
    isTimeRangeModeSupported &&
    (!SUPPORTED_METRICS[metricType].isFieldRequired || field)
  );
};

export const isValidMetrics = (metrics: Metric[], panelType: string, timeRangeMode?: string) => {
  return metrics.every((metric) => {
    const isMetricAggValid =
      metric.type !== 'filter_ratio' ||
      isMetricValid(metric.metric_agg || 'count', panelType, metric.field, timeRangeMode);
    return (
      metric.type === 'series_agg' ||
      (isMetricValid(metric.type, panelType, metric.field, timeRangeMode) && isMetricAggValid)
    );
  });
};
