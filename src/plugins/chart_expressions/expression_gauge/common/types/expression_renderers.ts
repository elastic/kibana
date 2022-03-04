/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PersistedState } from '../../../../visualizations/public';
import type { ChartsPluginSetup, PaletteRegistry } from '../../../../charts/public';
import type { IFieldFormat, SerializedFieldFormat } from '../../../../field_formats/common';
import type { GaugeExpressionProps } from './expression_functions';

export type FormatFactory = (mapping?: SerializedFieldFormat) => IFieldFormat;

export type GaugeRenderProps = GaugeExpressionProps & {
  formatFactory: FormatFactory;
  chartsThemeService: ChartsPluginSetup['theme'];
  paletteService: PaletteRegistry;
  uiState: PersistedState;
};

export interface ColorStop {
  color: string;
  stop: number;
}

export interface CustomPaletteParams {
  name?: string;
  reverse?: boolean;
  rangeType?: 'number' | 'percent';
  continuity?: 'above' | 'below' | 'all' | 'none';
  progression?: 'fixed';
  rangeMin?: number;
  rangeMax?: number;
  stops?: ColorStop[];
  colorStops?: ColorStop[];
  steps?: number;
}

export type RequiredPaletteParamTypes = Required<CustomPaletteParams>;
