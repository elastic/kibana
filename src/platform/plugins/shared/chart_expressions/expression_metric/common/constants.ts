/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { VisIconType } from '@kbn/chart-icons';

export const EXPRESSION_METRIC_NAME = 'metricVis';
export const EXPRESSION_METRIC_TRENDLINE_NAME = 'metricTrendline';

export const DEFAULT_TRENDLINE_NAME = 'default';

/** Feature flag: subdued metric tiles (faint fill, value in ink) instead of the full color as the background. */
export const METRIC_SUBDUED_TILES_FLAG = 'lens.metric.subdued';
/** Feature flag: a top border in the hue's base on subdued metric tiles. */
export const METRIC_SUBDUED_TOP_BORDER_FLAG = 'lens.metric.subdued.border';

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
} as const satisfies Record<string, VisIconType>;
