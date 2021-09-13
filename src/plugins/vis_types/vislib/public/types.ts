/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { $Values } from '@kbn/utility-types';
import { Position } from '@elastic/charts';

import {
  DateHistogramParams,
  FakeParams,
  HistogramParams,
  SchemaConfig,
} from '../../../visualizations/public';
import { Labels, Style } from '../../../charts/public';
import { TimeMarker } from './vislib/visualizations/time_marker';
import {
  AxisMode,
  AxisType,
  ChartMode,
  ChartType,
  InterpolationMode,
  ScaleType,
  ThresholdLineStyle,
} from './constants';

export interface ThresholdLine {
  show: boolean;
  value: number | null;
  width: number | null;
  style: ThresholdLineStyle;
  color: string;
}

export interface SeriesParam {
  data: { label: string; id: string };
  drawLinesBetweenPoints?: boolean;
  interpolate?: InterpolationMode;
  lineWidth?: number;
  mode: ChartMode;
  show: boolean;
  showCircles: boolean;
  circlesRadius: number;
  type: ChartType;
  valueAxis: string;
}

export interface Grid {
  categoryLines: boolean;
  valueAxis?: string;
}

export interface Scale {
  boundsMargin?: number | '';
  defaultYExtents?: boolean;
  max?: number | null;
  min?: number | null;
  mode?: AxisMode;
  setYExtents?: boolean;
  type: ScaleType;
}

export interface CategoryAxis {
  id: string;
  labels: Labels;
  position: Position;
  scale: Scale;
  show: boolean;
  title: {
    text?: string;
  };
  type: AxisType;
  /**
   * Used only for heatmap, here for consistent types when used in vis_type_vislib
   *
   * remove with vis_type_vislib
   * https://github.com/elastic/kibana/issues/56143
   */
  style?: Partial<Style>;
}

export interface ValueAxis extends CategoryAxis {
  name: string;
}

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

export type Dimension = Omit<SchemaConfig, 'params'> & {
  params: DateHistogramParams | HistogramParams | FakeParams | {};
};

export interface Dimensions {
  x: Dimension | null;
  y: Dimension[];
  z?: Dimension[];
  width?: Dimension[];
  series?: Dimension[];
  splitRow?: Dimension[];
  splitColumn?: Dimension[];
}
