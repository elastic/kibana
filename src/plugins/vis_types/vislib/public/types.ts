/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { $Values } from '@kbn/utility-types';
import { Position } from '@elastic/charts';

import { Labels } from '@kbn/charts-plugin/public';
import {
  CategoryAxis,
  Dimensions,
  Grid,
  SeriesParam,
  ThresholdLine,
  ValueAxis,
} from '@kbn/vis-type-xy-plugin/public';
import { TimeMarker } from './vislib/visualizations/time_marker';

/**
 * Gauge title alignment
 */
export const Alignment = Object.freeze({
  Automatic: 'automatic' as const,
  Horizontal: 'horizontal' as const,
  Vertical: 'vertical' as const,
});
export type Alignment = $Values<typeof Alignment>;

export const GaugeType = Object.freeze({
  Arc: 'Arc' as const,
  Circle: 'Circle' as const,
});
export type GaugeType = $Values<typeof GaugeType>;

export const VislibChartType = Object.freeze({
  Pie: 'pie' as const,
  Heatmap: 'heatmap' as const,
  Gauge: 'gauge' as const,
  Goal: 'goal' as const,
  Metric: 'metric' as const,
});
export type VislibChartType = $Values<typeof VislibChartType>;

export interface CommonVislibParams {
  addTooltip: boolean;
  addLegend: boolean;
  legendPosition: Position;
  dimensions: Dimensions;
}

export interface BasicVislibParams extends CommonVislibParams {
  type: VislibChartType;
  addLegend: boolean;
  addTimeMarker: boolean;
  categoryAxes: CategoryAxis[];
  orderBucketsBySum?: boolean;
  labels: Labels;
  thresholdLine: ThresholdLine;
  valueAxes: ValueAxis[];
  grid: Grid;
  gauge?: {
    percentageMode: boolean;
  };
  seriesParams: SeriesParam[];
  times: TimeMarker[];
  radiusRatio: number;
}
