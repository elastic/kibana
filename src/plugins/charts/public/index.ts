/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: https://github.com/elastic/kibana/issues/110891
/* eslint-disable @kbn/eslint/no_export_all */

import {
  RangeSelectContext,
  ValueClickContext,
  MultiValueClickContext,
} from '@kbn/embeddable-plugin/public';
import { ChartsPlugin } from './plugin';

export const plugin = () => new ChartsPlugin();

export type { ChartsPluginSetup, ChartsPluginStart } from './plugin';

export * from './static';
export { lightenColor } from './services/palettes/lighten_color';
export { useActiveCursor } from './services/active_cursor';

export interface ClickTriggerEvent {
  name: 'filter';
  data: ValueClickContext['data'];
}

export interface BrushTriggerEvent {
  name: 'brush';
  data: RangeSelectContext['data'];
}

export interface MultiClickTriggerEvent {
  name: 'multiFilter';
  data: MultiValueClickContext['data'];
}

export type {
  CustomPaletteArguments,
  CustomPaletteState,
  SystemPaletteArguments,
  ColorSchema,
  RawColorSchema,
  ColorMap,
  ColorSchemaParams,
  Labels,
  Style,
} from '../common';
export {
  paletteIds,
  ColorSchemas,
  vislibColorMaps,
  colorSchemas,
  getHeatmapColors,
  ColorMode,
  LabelRotation,
  defaultCountLabel,
} from '../common';
