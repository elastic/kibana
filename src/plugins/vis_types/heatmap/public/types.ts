/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { UiCounterMetricType } from '@kbn/analytics';
import type { Position } from '@elastic/charts';
import type {
  PaletteOutput,
  ChartsPluginSetup,
  Style,
  Labels,
  ColorSchemas,
} from '../../../charts/public';
import { Range } from '../../../expressions/public';
import type {
  SchemaConfig,
  FakeParams,
  HistogramParams,
  DateHistogramParams,
  ExpressionValueVisDimension,
} from '../../../visualizations/public';

export interface HeatmapTypeProps {
  showElasticChartsOptions?: boolean;
  palettes?: ChartsPluginSetup['palettes'];
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
}

interface HeatmapCommonParams {
  addLegend: boolean;
  addTooltip: boolean;
  enableHover: boolean;
  legendPosition: Position;
  useDistinctBands: boolean;
  percentageMode: boolean;
  isCellLabelVisible?: boolean;
}

export interface HeatmapVisConfig extends HeatmapCommonParams {
  xDimension: ExpressionValueVisDimension | null;
  yDimension: ExpressionValueVisDimension[];
  seriesDimension?: ExpressionValueVisDimension[];
  splitRowDimension?: ExpressionValueVisDimension[];
  splitColumnDimension?: ExpressionValueVisDimension[];
  palette: PaletteOutput;
}

export interface HeatmapVisParams extends HeatmapCommonParams {
  xDimension: Dimension | null;
  yDimension: Dimension[];
  seriesDimension: Dimension[];
  splitRowDimension?: Dimension[];
  splitColumnDimension?: Dimension[];
  palette: PaletteOutput;
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

export type Dimension = Omit<SchemaConfig, 'params'> & {
  params: DateHistogramParams | HistogramParams | FakeParams | {};
};

export interface Dimensions {
  x: Dimension | null;
  y: Dimension[];
  z?: Dimension[];
  series?: Dimension[];
  splitRow?: Dimension[];
  splitColumn?: Dimension[];
}
