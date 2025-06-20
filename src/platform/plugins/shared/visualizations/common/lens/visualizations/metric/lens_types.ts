/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LayoutDirection, MetricStyle } from '@elastic/charts';
import { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import { OptionalKeys } from 'utility-types';
import { CollapseFunction, LensLayerType } from '../lens_types';

export type ValueFontMode = Exclude<MetricStyle['valueFontSize'], number>;

export type SecondaryTrendType = 'none' | 'static' | 'dynamic';

export type SecondaryTrend =
  | { type: 'none' }
  | { type: 'static'; color: string }
  | {
      type: 'dynamic';
      visuals: 'icon' | 'value' | 'both';
      paletteId: string;
      reversed: boolean;
      baselineValue: number | 'primary';
    };

export interface MetricVisualizationState {
  layerId: string;
  layerType: LensLayerType;
  metricAccessor?: string;
  secondaryMetricAccessor?: string;
  maxAccessor?: string;
  breakdownByAccessor?: string;
  // the dimensions can optionally be single numbers
  // computed by collapsing all rows
  collapseFn?: CollapseFunction;
  subtitle?: string;
  secondaryPrefix?: string;
  secondaryTrend?: SecondaryTrend;
  progressDirection?: LayoutDirection;
  showBar?: boolean;
  titlesTextAlign?: MetricStyle['titlesTextAlign'];
  valuesTextAlign?: MetricStyle['valuesTextAlign'];
  iconAlign?: MetricStyle['iconAlign'];
  valueFontMode?: ValueFontMode;
  color?: string;
  icon?: string;
  palette?: PaletteOutput<CustomPaletteParams>;
  maxCols?: number;

  trendlineLayerId?: string;
  trendlineLayerType?: LensLayerType;
  trendlineTimeAccessor?: string;
  trendlineMetricAccessor?: string;
  trendlineSecondaryMetricAccessor?: string;
  trendlineBreakdownByAccessor?: string;
}

export type MetricVisualizationStateOptionals = Pick<
  MetricVisualizationState,
  OptionalKeys<MetricVisualizationState>
>;
