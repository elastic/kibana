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
import { ChartType } from '../../vis_type_xy/common/types';
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
  Automatic: 'automatic' as 'automatic',
  Horizontal: 'horizontal' as 'horizontal',
  Vertical: 'vertical' as 'vertical',
});
export type Alignment = $Values<typeof Alignment>;

export const GaugeType = Object.freeze({
  Arc: 'Arc' as 'Arc',
  Circle: 'Circle' as 'Circle',
});
export type GaugeType = $Values<typeof GaugeType>;

export interface CommonVislibParams {
  addTooltip: boolean;
  legendPosition: Position;
}

export interface BasicVislibParams extends CommonVislibParams {
  type: ChartType;
  addLegend: boolean;
  addTimeMarker: boolean;
  categoryAxes: CategoryAxis[];
  orderBucketsBySum?: boolean;
  labels: Labels;
  thresholdLine: ThresholdLine;
  valueAxes: ValueAxis[];
  grid: Grid;
  seriesParams: SeriesParam[];
  times: TimeMarker[];
  dimensions: Dimensions;
  radiusRatio: number;
}
