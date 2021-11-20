/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

import type { Dimension, Scale, ThresholdLine } from './param';

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
  splitColumn?: Aspect;
  splitRow?: Aspect;
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
  integersOnly: boolean;
  timeAxisLayerCount?: number;
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
  fillOpacity?: number;
  detailedTooltip?: boolean;
  isVislibVis?: boolean;
}
