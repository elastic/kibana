/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { ColorSchema, RawColorSchema, ColorMap } from './color_maps';
export {
  ColorSchemas,
  vislibColorMaps,
  colorSchemas,
  getHeatmapColors,
  truncatedColorMaps,
  truncatedColorSchemas,
} from './color_maps';

export { ColorMode, LabelRotation, defaultCountLabel } from './components';
export { checkIsMaxContinuity, checkIsMinContinuity } from './palette';
export * from './styles';
