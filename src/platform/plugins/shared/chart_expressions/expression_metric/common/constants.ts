/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const EXPRESSION_METRIC_NAME = 'metricVis';
export const EXPRESSION_METRIC_TRENDLINE_NAME = 'metricTrendline';

export const DEFAULT_TRENDLINE_NAME = 'default';

export const LabelPosition = {
  BOTTOM: 'bottom',
  TOP: 'top',
} as const;

export const AvailableMetricIcons = {
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
