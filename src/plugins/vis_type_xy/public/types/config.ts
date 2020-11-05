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

import {
  AxisSpec,
  CustomTooltip,
  Fit,
  GridLineStyle,
  Position,
  Rotation,
  SeriesScales,
  TickFormatter,
  TooltipProps,
  TooltipValueFormatter,
  YDomainRange,
} from '@elastic/charts';

import { Dimension, Scale, ThresholdLine } from './param';

export interface Column {
  id: string | null;
  name: string;
}

export interface Aspect {
  accessor: Column['id'];
  aggType: string | null;
  aggId: string | null;
  column?: Dimension['accessor'];
  title: Column['name'];
  format?: Dimension['format'];
  formatter?: TickFormatter;
  params: Dimension['params'];
}

export interface Aspects {
  x: Aspect;
  y: Aspect[];
  z?: Aspect;
  series?: Aspect[];
}

export interface AxisGrid {
  show?: boolean;
  styles?: GridLineStyle;
}

export interface TickOptions {
  show?: boolean;
  size?: number;
  count?: number;
  padding?: number;
  formatter?: TickFormatter;
  labelFormatter?: TickFormatter;
  rotation?: number;
  showDuplicates?: boolean;
  integersOnly?: boolean;
  showOverlappingTicks?: boolean;
  showOverlappingLabels?: boolean;
}

export type YScaleType = SeriesScales['yScaleType'];
export type XScaleType = SeriesScales['xScaleType'];

export type ScaleConfig<S extends XScaleType | YScaleType> = Omit<Scale, 'type'> & {
  type?: S;
};

export interface AxisConfig<S extends XScaleType | YScaleType> {
  id: string;
  groupId?: string;
  position: Position;
  ticks?: TickOptions;
  show: boolean;
  style: AxisSpec['style'];
  scale: ScaleConfig<S>;
  domain?: YDomainRange;
  title?: string;
  grid?: AxisGrid;
}

export interface LegendOptions {
  show: boolean;
  position?: Position;
}

export type ThresholdLineConfig = Omit<ThresholdLine, 'style'> & {
  dash?: number[];
  groupId?: string;
};

export type TooltipConfig = Omit<TooltipProps, 'customTooltip'> & {
  detailedTooltip?: (headerFormatter?: TooltipValueFormatter) => CustomTooltip;
};

export interface VisConfig {
  legend: LegendOptions;
  tooltip: TooltipConfig;
  xAxis: AxisConfig<XScaleType>;
  yAxes: Array<AxisConfig<YScaleType>>;
  aspects: Aspects;
  rotation: Rotation;
  thresholdLine: ThresholdLineConfig;
  orderBucketsBySum?: boolean;
  showCurrentTime: boolean;
  isTimeChart: boolean;
  markSizeRatio: number;
  showValueLabel: boolean;
  enableHistogramMode: boolean;
  fittingFunction?: Exclude<Fit, 'explicit'>;
  detailedTooltip?: boolean;
  isVislibVis?: boolean;
}
