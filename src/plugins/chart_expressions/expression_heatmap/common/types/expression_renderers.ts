/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PaletteRegistry } from '@kbn/coloring';
import type { ChartsPluginSetup, ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DatatableUtilitiesService } from '@kbn/data-plugin/common';
import type { IFieldFormat, SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import type {
  RangeSelectContext,
  ValueClickContext,
  MultiValueClickContext,
} from '@kbn/embeddable-plugin/public';
import type { PersistedState } from '@kbn/visualizations-plugin/public';
import { IInterpreterRenderHandlers } from '@kbn/expressions-plugin/common';
import type { HeatmapExpressionProps } from './expression_functions';

export interface FilterEvent {
  name: 'filter';
  data: ValueClickContext['data'];
}

export interface BrushEvent {
  name: 'brush';
  data: RangeSelectContext['data'];
}

export interface MultiFilterEvent {
  name: 'multiFilter';
  data: MultiValueClickContext['data'];
}

export type FormatFactory = (mapping?: SerializedFieldFormat) => IFieldFormat;

export type HeatmapRenderProps = HeatmapExpressionProps & {
  timeZone?: string;
  formatFactory: FormatFactory;
  chartsThemeService: ChartsPluginSetup['theme'];
  chartsActiveCursorService: ChartsPluginStart['activeCursor'];
  datatableUtilities: DatatableUtilitiesService;
  onClickValue: (data: FilterEvent['data']) => void;
  onSelectRange: (data: BrushEvent['data']) => void;
  onClickMultiValue: (data: MultiFilterEvent['data']) => void;
  paletteService: PaletteRegistry;
  uiState: PersistedState;
  interactive: boolean;
  syncTooltips: boolean;
  syncCursor: boolean;
  renderComplete: IInterpreterRenderHandlers['done'];
};
