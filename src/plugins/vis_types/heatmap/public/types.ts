/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Position } from '@elastic/charts';
import type { ChartsPluginSetup, Style, Labels, ColorSchemas } from '@kbn/charts-plugin/public';
import { Range } from '@kbn/expressions-plugin/public';
import { LegendSize } from '@kbn/visualizations-plugin/public';

export interface HeatmapTypeProps {
  showElasticChartsOptions?: boolean;
  palettes?: ChartsPluginSetup['palettes'];
}

export interface HeatmapVisParams {
  addLegend: boolean;
  addTooltip: boolean;
  enableHover: boolean;
  legendPosition: Position;
  truncateLegend?: boolean;
  maxLegendLines?: number;
  legendSize?: LegendSize;
  lastRangeIsRightOpen: boolean;
  percentageMode: boolean;
  valueAxes: ValueAxis[];
  colorSchema: ColorSchemas;
  invertColors: boolean;
  colorsNumber: number | '';
  setColorRange: boolean;
  colorsRange?: Range[];
  percentageFormatPattern?: string;
}

// ToDo: move them to constants
export enum ScaleType {
  Linear = 'linear',
  Log = 'log',
  SquareRoot = 'square root',
}

export enum AxisType {
  Category = 'category',
  Value = 'value',
}
export enum AxisMode {
  Normal = 'normal',
  Percentage = 'percentage',
  Wiggle = 'wiggle',
  Silhouette = 'silhouette',
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

interface CategoryAxis {
  id: string;
  labels: Labels;
  position: Position;
  scale: Scale;
  show: boolean;
  title?: {
    text?: string;
  };
  type: AxisType;
  style?: Partial<Style>;
}

export interface ValueAxis extends CategoryAxis {
  name: string;
}
