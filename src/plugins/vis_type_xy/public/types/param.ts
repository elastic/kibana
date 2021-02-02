/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Fit, Position } from '@elastic/charts';

import { Style, Labels, PaletteOutput } from '../../../charts/public';
import { SchemaConfig } from '../../../visualizations/public';

import { ChartType } from '../../common';
import {
  ChartMode,
  AxisMode,
  AxisType,
  InterpolationMode,
  ScaleType,
  ThresholdLineStyle,
} from './constants';

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
  style: Partial<Style>;
}

export interface ValueAxis extends CategoryAxis {
  name: string;
}

export interface ThresholdLine {
  show: boolean;
  value: number | null;
  width: number | null;
  style: ThresholdLineStyle;
  color: string;
}

export interface SeriesParam {
  data: { label: string; id: string };
  drawLinesBetweenPoints: boolean;
  interpolate?: InterpolationMode;
  lineWidth?: number;
  mode: ChartMode;
  show: boolean;
  showCircles: boolean;
  type: ChartType;
  valueAxis: string;
}

export interface Grid {
  categoryLines: boolean;
  valueAxis?: string;
}

export interface TimeMarker {
  time: string;
  class?: string;
  color?: string;
  opacity?: number;
  width?: number;
}

export interface DateHistogramParams {
  date: boolean;
  interval: number;
  intervalESValue: number;
  intervalESUnit: string;
  format: string;
  bounds?: {
    min: string | number;
    max: string | number;
  };
}

export interface HistogramParams {
  interval: number;
}

export interface FakeParams {
  defaultValue: string;
}

export type Dimension = Omit<SchemaConfig, 'params'> & {
  params: DateHistogramParams | HistogramParams | FakeParams | {};
};

export interface Dimensions {
  x: Dimension | null;
  y: Dimension[];
  z?: Dimension[];
  width?: Dimension[];
  series?: Dimension | Dimension[];
  splitRow?: Dimension[];
  splitColumn?: Dimension[];
}

export interface VisParams {
  type: ChartType;
  addLegend: boolean;
  addTooltip: boolean;
  legendPosition: Position;
  addTimeMarker: boolean;
  categoryAxes: CategoryAxis[];
  orderBucketsBySum?: boolean;
  labels: Labels;
  thresholdLine: ThresholdLine;
  valueAxes: ValueAxis[];
  grid: Grid;
  seriesParams: SeriesParam[];
  dimensions: Dimensions;
  radiusRatio: number;
  times: TimeMarker[]; // For compatibility with vislib
  /**
   * flag to indicate old vislib visualizations
   * used for backwards compatibility including colors
   */
  isVislibVis?: boolean;
  /**
   * Add for detailed tooltip option
   */
  detailedTooltip?: boolean;
  palette: PaletteOutput;
  fittingFunction?: Exclude<Fit, 'explicit'>;
}
