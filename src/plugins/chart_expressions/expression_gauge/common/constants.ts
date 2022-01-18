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
  horizontalBullet: 'horizontalBullet',
  verticalBullet: 'verticalBullet',
} as const;

export const GaugeTicksPositions = {
  auto: 'auto',
  bands: 'bands',
} as const;

export const GaugeLabelMajorModes = {
  auto: 'auto',
  custom: 'custom',
  none: 'none',
} as const;

export const GaugeColorModes = {
  palette: 'palette',
  none: 'none',
} as const;
