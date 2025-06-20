/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import { HeatmapExpressionLayerState } from './expression_types';

export type HeatmapPalette = PaletteOutput<CustomPaletteParams> & { accessor: string };

export type HeatmapVisualizationState = HeatmapExpressionLayerState & {
  xAccessor?: string;
  yAccessor?: string;
  valueAccessor?: string;
  splitRowAccessor?: string;
  splitColumnAccessor?: string;
  // need to store the current accessor to reset the color stops at accessor change
  palette?: HeatmapPalette;
};
