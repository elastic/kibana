/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const COLOR_MAPPING_SETTING = 'visualization:colorMapping';
export const LEGACY_TIME_AXIS = 'visualization:useLegacyTimeAxis';

export type {
  CustomPaletteArguments,
  CustomPaletteState,
  SystemPaletteArguments,
  PaletteOutput,
} from './palette';
export { defaultCustomColors, palette, systemPalette } from './palette';

export { paletteIds } from './constants';
export type { ColorSchema, RawColorSchema, ColorMap } from './static';
export {
  ColorSchemas,
  vislibColorMaps,
  colorSchemas,
  getHeatmapColors,
  truncatedColorMaps,
  truncatedColorSchemas,
  ColorMode,
  LabelRotation,
  defaultCountLabel,
  MULTILAYER_TIME_AXIS_STYLE,
  checkIsMinContinuity,
  checkIsMaxContinuity,
} from './static';

export type { ColorSchemaParams, Labels, Style, PaletteContinuity } from './types';
