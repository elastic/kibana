/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { CategoricalColorMapping, type ColorMappingProps } from './categorical_color_mapping';
export type { ColorMappingInputData } from './categorical_color_mapping';
export type { ColorMapping } from './config';
export * from './palettes';
export * from './color/color_handling';
export { SPECIAL_TOKENS_STRING_CONVERTION } from './color/rule_matching';
export {
  DEFAULT_COLOR_MAPPING_CONFIG,
  DEFAULT_OTHER_ASSIGNMENT_INDEX,
  getPaletteColors,
  getColorsFromMapping,
} from './config/default_color_mapping';
