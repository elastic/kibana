/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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

export const XY_ANNOTATION_LAYER_TYPES = ['annotations'] as const;

export const AVAILABLE_XY_LAYER_TYPES = [
  ...XY_DATA_LAYER_TYPES,
  ...XY_REFERENCE_LAYER_TYPES,
  ...XY_ANNOTATION_LAYER_TYPES,
];
