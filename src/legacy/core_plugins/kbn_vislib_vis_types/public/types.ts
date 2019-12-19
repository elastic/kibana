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

import { ColorSchemas } from 'ui/color_maps';
import { TimeMarker } from './vislib/visualizations/time_marker';
import {
  Positions,
  ChartModes,
  ChartTypes,
  AxisModes,
  AxisTypes,
  InterpolationModes,
  Rotates,
  ScaleTypes,
  ThresholdLineStyles,
} from './utils/collections';

export interface CommonVislibParams {
  addTooltip: boolean;
  legendPosition: Positions;
}

export interface ColorSchemaVislibParams {
  colorSchema: ColorSchemas;
  invertColors: boolean;
}

export interface Labels {
  color?: string;
  filter?: boolean;
  overwriteColor?: boolean;
  rotate?: Rotates;
  show: boolean;
  truncate?: number | null;
}

export interface Style {
  bgFill: string;
  bgColor: boolean;
  labelColor: boolean;
  subText: string;
  fontSize: number;
}

export interface Scale {
  boundsMargin?: number | '';
  defaultYExtents?: boolean;
  max?: number | null;
  min?: number | null;
  mode?: AxisModes;
  setYExtents?: boolean;
  type: ScaleTypes;
}

interface ThresholdLine {
  show: boolean;
  value: number | null;
  width: number | null;
  style: ThresholdLineStyles;
  color: string;
}

export interface Axis {
  id: string;
  labels: Labels;
  position: Positions;
  scale: Scale;
  show: boolean;
  style: Style;
  title: { text: string };
  type: AxisTypes;
}

export interface ValueAxis extends Axis {
  name: string;
}

export interface SeriesParam {
  data: { label: string; id: string };
  drawLinesBetweenPoints: boolean;
  interpolate: InterpolationModes;
  lineWidth?: number;
  mode: ChartModes;
  show: boolean;
  showCircles: boolean;
  type: ChartTypes;
  valueAxis: string;
}

export interface BasicVislibParams extends CommonVislibParams {
  addTimeMarker: boolean;
  categoryAxes: Axis[];
  orderBucketsBySum?: boolean;
  labels: Labels;
  thresholdLine: ThresholdLine;
  valueAxes: ValueAxis[];
  grid: {
    categoryLines: boolean;
    valueAxis?: string;
  };
  seriesParams: SeriesParam[];
  times: TimeMarker[];
}
