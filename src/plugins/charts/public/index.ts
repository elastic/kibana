/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// TODO: https://github.com/elastic/kibana/issues/110891
/* eslint-disable @kbn/eslint/no_export_all */

import { ChartsPlugin } from './plugin';

export const plugin = () => new ChartsPlugin();

export { ChartsPluginSetup, ChartsPluginStart } from './plugin';

export * from './static';
export * from './services/palettes/types';
export { lightenColor } from './services/palettes/lighten_color';
export { useActiveCursor } from './services/active_cursor';

export {
  PaletteOutput,
  CustomPaletteArguments,
  CustomPaletteState,
  SystemPaletteArguments,
  paletteIds,
  ColorSchemas,
  ColorSchema,
  RawColorSchema,
  ColorMap,
  vislibColorMaps,
  colorSchemas,
  getHeatmapColors,
  truncatedColorMaps,
  truncatedColorSchemas,
  ColorMode,
  LabelRotation,
  defaultCountLabel,
  ColorSchemaParams,
  Labels,
  Style,
} from '../common';
