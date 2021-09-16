/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Position } from '@elastic/charts';
import type { Style, Labels } from '../../../../charts/public';
import type { ExpressionValueXYDimension } from '../../../../visualizations/public';
import type {
  ChartMode,
  AxisMode,
  AxisType,
  InterpolationMode,
  ScaleType,
  ThresholdLineStyle,
} from './constants';
import { ChartType } from './expression_functions';

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

export interface TimeMarker {
  time: string;
  class?: string;
  color?: string;
  opacity?: number;
  width?: number;
}

export type Dimension = Omit<ExpressionValueXYDimension, 'type'>;

export interface Dimensions {
  x: Dimension | null;
  y: Dimension[];
  z?: Dimension[];
  width?: Dimension[];
  series?: Dimension[];
  splitRow?: Dimension[];
  splitColumn?: Dimension[];
}
