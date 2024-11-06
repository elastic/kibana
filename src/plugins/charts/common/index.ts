/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const COLOR_MAPPING_SETTING = 'visualization:colorMapping';
export const LEGACY_TIME_AXIS = 'visualization:useLegacyTimeAxis';

export type {
  CustomPaletteArguments,
  CustomPaletteState,
  SystemPaletteArguments,
  SystemPaletteExpressionFunctionDefinition,
} from './expressions/palette';
export { palette, systemPalette } from './expressions/palette';

export { paletteIds, defaultCustomColors } from './constants';
export type {
  AllowedChartOverrides,
  AllowedSettingsOverrides,
  ColorSchema,
  RawColorSchema,
  ColorMap,
} from './static';
export {
  ColorSchemas,
  vislibColorMaps,
  colorSchemas,
  getHeatmapColors,
  ColorMode,
  LabelRotation,
  defaultCountLabel,
  MULTILAYER_TIME_AXIS_STYLE,
} from './static';

export type { ColorSchemaParams, Labels, Style } from './types';
