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

import { $Values } from '@kbn/utility-types';
import { Position } from '@elastic/charts';

import { Labels } from '../../charts/public';
import {
  CategoryAxis,
  Dimensions,
  Grid,
  SeriesParam,
  ThresholdLine,
  ValueAxis,
} from '../../vis_type_xy/public';
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
  Histogram: 'histogram' as const,
  HorizontalBar: 'horizontal_bar' as const,
  Line: 'line' as const,
  Pie: 'pie' as const,
  Area: 'area' as const,
  PointSeries: 'point_series' as const,
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
