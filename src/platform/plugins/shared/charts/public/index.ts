/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: https://github.com/elastic/kibana/issues/110891

import type { Datatable } from '@kbn/expressions-plugin/common';
import type { BooleanRelation } from '@kbn/es-query';
import { ChartsPlugin } from './plugin';

export const plugin = () => new ChartsPlugin();

export type { ChartsPluginSetup, ChartsPluginStart } from './plugin';

export {
  createColorPalette,
  seedColors,
  CurrentTime,
  EmptyPlaceholder,
  useCommonChartStyles,
  Endzones,
  getAdjustedInterval,
  renderEndzoneTooltip,
  Warnings,
  ColorPickerLazy,
  ColorPicker,
  LegendToggleLazy,
  LegendToggle,
} from './static';
export { lightenColor } from './services/palettes/lighten_color';
export { decreaseOpacity } from './services/palettes/decrease_opacity';
export { COMPATIBILITY_PALETTE_ID } from './services/palettes/palettes';
export { useActiveCursor } from './services/active_cursor';

export interface ClickTriggerEvent {
  name: 'filter';
  data: {
    data: Array<{
      table: Pick<Datatable, 'rows' | 'columns'>;
      column: number;
      row: number;
      value: any;
    }>;
    timeFieldName?: string;
    negate?: boolean;
  };
}

export interface BrushTriggerEvent {
  name: 'brush';
  data: {
    table: Datatable;
    column: number;
    range: number[];
    timeFieldName?: string;
  };
}

export interface MultiClickTriggerEvent {
  name: 'multiFilter';
  data: {
    data: Array<{
      table: Pick<Datatable, 'rows' | 'columns'>;
      cells: Array<{
        column: number;
        row: number;
      }>;
      relation?: BooleanRelation;
    }>;
    timeFieldName?: string;
    negate?: boolean;
  };
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
