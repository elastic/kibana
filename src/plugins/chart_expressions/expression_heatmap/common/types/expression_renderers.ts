/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PaletteRegistry } from '@kbn/coloring';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { IFieldFormat, SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import type {
  RangeSelectContext,
  ValueClickContext,
  SELECT_RANGE_TRIGGER,
  VALUE_CLICK_TRIGGER,
} from '@kbn/embeddable-plugin/public';
import type { PersistedState } from '@kbn/visualizations-plugin/public';
import type { HeatmapExpressionProps } from './expression_functions';

export interface FilterEvent {
  name: typeof VALUE_CLICK_TRIGGER;
  data: ValueClickContext;
}

export interface BrushEvent {
  name: typeof SELECT_RANGE_TRIGGER;
  data: RangeSelectContext;
}

export type FormatFactory = (mapping?: SerializedFieldFormat) => IFieldFormat;

export type HeatmapRenderProps = HeatmapExpressionProps & {
  timeZone?: string;
  formatFactory: FormatFactory;
  chartsThemeService: ChartsPluginSetup['theme'];
  onClickValue: (data: FilterEvent['data']) => void;
  onSelectRange: (data: BrushEvent['data']) => void;
  paletteService: PaletteRegistry;
  uiState: PersistedState;
  interactive: boolean;
};
