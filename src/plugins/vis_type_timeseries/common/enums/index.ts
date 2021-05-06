/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { PANEL_TYPES } from './panel_types';
export { MODEL_TYPES } from './model_types';
export { METRIC_TYPES, BUCKET_TYPES, EXTENDED_STATS_TYPES } from './metric_types';
export { TIME_RANGE_DATA_MODES, TIME_RANGE_MODE_KEY } from './timerange_data_modes';

export enum PALETTES {
  GRADIENT = 'gradient',
  RAINBOW = 'rainbow',
}

export enum TOOLTIP_MODES {
  SHOW_ALL = 'show_all',
  SHOW_FOCUSED = 'show_focused',
}
