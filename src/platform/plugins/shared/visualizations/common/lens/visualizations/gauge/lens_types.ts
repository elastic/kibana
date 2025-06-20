/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LensLayerType } from '../lens_types';
import type { GaugeExpressionArgs } from './expression_types';

export type GaugeAccessors = Pick<GaugeExpressionArgs, 'metric' | 'goal' | 'min' | 'max'>;

type LensGaugeState = Omit<GaugeExpressionArgs, 'metric' | 'goal' | 'min' | 'max'> & {
  metricAccessor?: string;
  minAccessor?: string;
  maxAccessor?: string;
  goalAccessor?: string;
};

export type GaugeVisualizationState = LensGaugeState & {
  layerId: string;
  layerType: LensLayerType;
};
