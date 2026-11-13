/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type {
  ColorMappingInputCategoricalData,
  ColorMappingInputContinuousData,
  ColorMappingInputData,
} from './types';
export type { ColorMapping } from './config';
export * from './color/color_handling';
export { getValueKey } from './color/utils';
export {
  changeAlpha,
  hasEnoughContrast,
  isSameColor,
  getValidColor as getChromaColor,
} from './color/color_math';
export { SPECIAL_TOKENS_STRING_CONVERSION, getSpecialString } from './special_tokens';
export {
  type ColorAssignmentMatcher,
  getColorAssignmentMatcher,
} from './color/color_assignment_matcher';
export {
  DEFAULT_COLOR_MAPPING_CONFIG,
  DEFAULT_NEUTRAL_PALETTE_INDEX,
  DEFAULT_OTHER_ASSIGNMENT,
  DEFAULT_OTHER_ASSIGNMENT_INDEX,
  getPaletteColors,
  getColorsFromMapping,
} from './config/default_color_mapping';
export {
  hasCustomColors,
  updateAssignmentsPalette,
  updateColorModePalette,
} from './config/assignments';
export { getOtherAssignmentColor } from './config/utils';
export * from './custom_match';
