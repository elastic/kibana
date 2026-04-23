/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  MetricLayoutWithDefault,
  MetricStateDefaults,
  PrimaryMetricPosition,
  MetricStyleTemplateId,
} from './types';

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

export const LENS_LEGACY_METRIC_STATE_DEFAULTS: Pick<MetricStateDefaults, 'iconAlign'> = {
  iconAlign: 'left',
};

/**
 * Style template presets by primary metric position
 */
export const LENS_METRIC_STYLE_TEMPLATE: Record<MetricStyleTemplateId, MetricLayoutWithDefault> = {
  bottom: {
    titlesTextAlign: 'left',
    primaryPosition: 'bottom',
    primaryAlign: 'right',
    iconAlign: 'right',
    secondaryAlign: 'right',
  },
  middle: {
    titlesTextAlign: 'left',
    primaryPosition: 'middle',
    primaryAlign: 'center',
    iconAlign: 'right',
    secondaryAlign: 'right',
  },
  top: {
    titlesTextAlign: 'left',
    primaryPosition: 'top',
    primaryAlign: 'left',
    iconAlign: 'right',
    secondaryAlign: 'left',
  },
} as const;

const DEFAULT_STYLE_TEMPLATE: PrimaryMetricPosition = 'top';
const defaultStyleTemplate = LENS_METRIC_STYLE_TEMPLATE[DEFAULT_STYLE_TEMPLATE];

/**
 * Defaults for select optional Metric vis state options
 */
export const LENS_METRIC_STATE_DEFAULTS: MetricStateDefaults = {
  ...defaultStyleTemplate,
  iconAlign: defaultStyleTemplate.iconAlign ?? 'right',
  secondaryAlign: defaultStyleTemplate.secondaryAlign ?? 'right',
  valueFontMode: 'default',
  primaryPosition: DEFAULT_STYLE_TEMPLATE,
  secondaryLabelPosition: 'before',
  applyColorTo: 'background',
};

export const LENS_METRIC_SECONDARY_DEFAULT_STATIC_COLOR = '#E4E8F1';

export const LENS_METRIC_DEFAULT_TRENDLINE_NAME = 'default';
export const LENS_METRIC_TRENDLINE_NAME = 'metricTrendline';

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

export const LENS_EXPRESSION_METRIC_TRENDLINE_NAME = 'metricTrendline';
