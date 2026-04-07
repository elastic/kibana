/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { YAxisSchemaType, XAxisSchemaType } from '../../../schema/charts/xy';

export const XY_DATA_LAYER_TYPES = [
  'area',
  'area_percentage',
  'area_stacked',
  'bar',
  'bar_horizontal',
  'bar_horizontal_stacked',
  'bar_horizontal_percentage',
  'bar_percentage',
  'bar_stacked',
  'line',
] as const;

export const XY_REFERENCE_LAYER_TYPES = ['referenceLines'] as const;

export const XY_ANNOTATION_LAYER_TYPES = ['annotations', 'annotation_group'] as const;

export const AVAILABLE_XY_LAYER_TYPES = [
  ...XY_DATA_LAYER_TYPES,
  ...XY_REFERENCE_LAYER_TYPES,
  ...XY_ANNOTATION_LAYER_TYPES,
];

export const DEFAULT_AXIS_TICKS_VISIBLE = true;

export const DEFAULT_AXIS_GRID_VISIBLE = true;

export const DEFAULT_AXIS_TITLE_VISIBLE = true;

export const DEFAULT_AXIS_LABELS_ORIENTATION = 'horizontal' as const;

export const DEFAULT_Y_AXIS_DOMAIN = {
  type: 'full',
  rounding: true,
} satisfies YAxisSchemaType['domain'];

export const DEFAULT_X_AXIS_DOMAIN = {
  type: 'fit',
  rounding: false,
} satisfies XAxisSchemaType['domain'];
