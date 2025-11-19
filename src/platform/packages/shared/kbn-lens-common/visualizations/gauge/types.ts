/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  GaugeArguments as GaugeExpressionArgs,
  GaugeColorMode,
} from '@kbn/expression-gauge-plugin/common';
import type { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import type { LensLayerType } from '../types';
export type GaugeAccessors = Pick<GaugeExpressionArgs, 'metric' | 'goal' | 'min' | 'max'>;

export type GaugeVisualizationState = Omit<
  GaugeExpressionArgs,
  'metric' | 'goal' | 'min' | 'max' | 'palette' | 'colorMode'
> & {
  metricAccessor?: string;
  minAccessor?: string;
  maxAccessor?: string;
  goalAccessor?: string;
  layerId: string;
  layerType: LensLayerType;
  palette?: PaletteOutput<CustomPaletteParams>;
  colorMode?: GaugeColorMode;
};
