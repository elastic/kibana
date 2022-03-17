/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const EXPRESSION_GAUGE_NAME = 'gauge';
export const GAUGE_FUNCTION_RENDERER_NAME = 'gauge_renderer';

export const GaugeShapes = {
  HORIZONTAL_BULLET: 'horizontalBullet',
  VERTICAL_BULLET: 'verticalBullet',
  ARC: 'arc',
  CIRCLE: 'circle',
} as const;

export const GaugeTicksPositions = {
  HIDDEN: 'hidden',
  AUTO: 'auto',
  BANDS: 'bands',
} as const;

export const GaugeLabelMajorModes = {
  AUTO: 'auto',
  CUSTOM: 'custom',
  NONE: 'none',
} as const;

export const GaugeCentralMajorModes = {
  AUTO: 'auto',
  CUSTOM: 'custom',
  NONE: 'none',
} as const;

export const GaugeColorModes = {
  PALETTE: 'palette',
  NONE: 'none',
} as const;
