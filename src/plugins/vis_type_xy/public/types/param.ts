/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { Fit, Position } from '@elastic/charts';

import { Style, Labels } from '../../../charts/public';
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
   * remove with vis_type_vislib
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
  fittingFunction?: Exclude<Fit, 'explicit'>;
}
