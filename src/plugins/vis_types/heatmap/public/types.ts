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
import type { ExpressionValueBoxed } from '../../../expressions/public';
// import { RangeValues } from '../../../vis_default_editor/public';
import { Range } from '../../../expressions/public';
import type {
  SchemaConfig,
  FakeParams,
  HistogramParams,
  DateHistogramParams,
  ExpressionValueXYDimension,
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
  colorsNumber: number | '';
  invertColors: boolean;
  colorsRange?: Range[];
  colorSchema: ColorSchemas;
  setColorRange: boolean;
  percentageMode: boolean;
  percentageFormatPattern?: string;
}

export interface HeatmapVisConfig extends HeatmapCommonParams {
  xDimension: ExpressionValueXYDimension | null;
  yDimension: ExpressionValueXYDimension[];
  zDimension?: ExpressionValueXYDimension[];
  widthDimension?: ExpressionValueXYDimension[];
  seriesDimension?: ExpressionValueXYDimension[];
  splitRowDimension?: ExpressionValueXYDimension[];
  splitColumnDimension?: ExpressionValueXYDimension[];
  palette: PaletteOutput;
  valueAxes: ExpressionValueValueAxis[];
  categoryAxes: ExpressionValueCategoryAxis[];
}

export interface HeatmapVisParams extends HeatmapCommonParams {
  dimensions: Dimensions;
  palette: PaletteOutput;
  valueAxes: ValueAxis[];
  categoryAxes: CategoryAxis[];
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

type ExpressionValueCategoryAxis = ExpressionValueBoxed<
  'category_axis',
  {
    id: CategoryAxis['id'];
    show: CategoryAxis['show'];
    position: CategoryAxis['position'];
    axisType: CategoryAxis['type'];
    title: {
      text?: string;
    };
    labels: CategoryAxis['labels'];
    scale: CategoryAxis['scale'];
  }
>;

type ExpressionValueValueAxis = ExpressionValueBoxed<
  'value_axis',
  {
    name: string;
    id: string;
    show: boolean;
    position: CategoryAxis['position'];
    axisType: CategoryAxis['type'];
    title: {
      text?: string;
    };
    labels: CategoryAxis['labels'];
    scale: CategoryAxis['scale'];
  }
>;

export interface CategoryAxis {
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

// export interface HeatmapContainerDimensions {
//   width: number;
//   height: number;
// }

export type Dimension = Omit<SchemaConfig, 'params'> & {
  params: DateHistogramParams | HistogramParams | FakeParams | {};
};

export interface Dimensions {
  x: Dimension | null;
  y: Dimension[];
  z?: Dimension[];
  width?: Dimension[];
  series?: Dimension[];
  splitRow?: Dimension[];
  splitColumn?: Dimension[];
}
