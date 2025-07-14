/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricVisualizationStateOptionals } from './lens_types';

export const LENS_METRIC_ID = 'lnsMetric';

export const LENS_METRIC_GROUP_ID = {
  METRIC: 'metric',
  SECONDARY_METRIC: 'secondaryMetric',
  MAX: 'max',
  BREAKDOWN_BY: 'breakdownBy',
  TREND_METRIC: 'trendMetric',
  TREND_SECONDARY_METRIC: 'trendSecondaryMetric',
  TREND_TIME: 'trendTime',
  TREND_BREAKDOWN_BY: 'trendBreakdownBy',
} as const;

/**
 * Defaults for select optional Metric vis state options
 */
export const LENS_METRIC_STATE_DEFAULTS: Required<
  Pick<
    MetricVisualizationStateOptionals,
    'titlesTextAlign' | 'valuesTextAlign' | 'iconAlign' | 'valueFontMode'
  >
> = {
  titlesTextAlign: 'left',
  valuesTextAlign: 'right',
  iconAlign: 'left',
  valueFontMode: 'default',
};

export const LENS_METRIC_SECONDARY_DEFAULT_STATIC_COLOR = '#E4E8F1';

export const LENS_METRIC_DEFAULT_TRENDLINE_NAME = 'default';
export const METRIC_TRENDLINE_NAME = 'metricTrendline';

export const LENS_METRIC_LABEL_POSITION = {
  BOTTOM: 'bottom',
  TOP: 'top',
} as const;

export const LENS_METRIC_SECONDARY_BASELINE_DEFAULT_VALUE = 0;

export const LENS_METRIC_BREAKDOWN_DEFAULT_MAX_COLUMNS = 3;

export const LENS_METRIC_AVAILABLE_METRIC_ICONS = {
  EMPTY: 'empty',
  SORTUP: 'sortUp',
  SORTDOWN: 'sortDown',
  COMPUTE: 'compute',
  ASTERISK: 'asterisk',
  ALERT: 'alert',
  BELL: 'bell',
  BOLT: 'bolt',
  BUG: 'bug',
  EDITOR_COMMENT: 'editorComment',
  FLAG: 'flag',
  HEART: 'heart',
  MAP_MARKER: 'mapMarker',
  PIN: 'pin',
  STAR_EMPTY: 'starEmpty',
  TAG: 'tag',
  GLOBE: 'globe',
  TEMPERATURE: 'temperature',
} as const;

export const EXPRESSION_METRIC_TRENDLINE_NAME = 'metricTrendline';
