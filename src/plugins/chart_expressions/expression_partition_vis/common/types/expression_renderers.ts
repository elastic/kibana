/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Position } from '@elastic/charts';
import type { AllowedChartOverrides, AllowedSettingsOverrides } from '@kbn/charts-plugin/common';
import type { PaletteOutput } from '@kbn/coloring';
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import type { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import type { LegendSize } from '@kbn/visualizations-plugin/public';
import {
  type AllowedPartitionOverrides,
  ChartTypes,
  type ExpressionValuePartitionLabels,
} from './expression_functions';

export enum EmptySizeRatios {
  SMALL = 0.3,
  MEDIUM = 0.54,
  LARGE = 0.7,
}

export interface Dimension {
  accessor: number;
  format: {
    id?: string;
    params?: SerializedFieldFormat;
  };
}

export interface Dimensions {
  metrics: Array<ExpressionValueVisDimension | string>;
  buckets?: Array<ExpressionValueVisDimension | string>;
  splitRow?: Array<ExpressionValueVisDimension | string>;
  splitColumn?: Array<ExpressionValueVisDimension | string>;
}

export interface LabelsParams {
  show: boolean;
  position: LabelPositions;
  values: boolean;
  valuesFormat: ValueFormats;
  percentDecimals: number;
  colorOverrides: Record<string, string>;
  /** @deprecated This field is deprecated and going to be removed in the futher release versions. */
  truncate?: number | null;
  /** @deprecated This field is deprecated and going to be removed in the futher release versions. */
  last_level?: boolean;
}

interface VisCommonParams {
  addTooltip: boolean;
  legendDisplay: LegendDisplay;
  legendPosition: Position;
  truncateLegend: boolean;
  maxLegendLines: number;
  legendSize?: LegendSize;
  ariaLabel?: string;
  colorMapping?: string; // JSON stringified object of the color mapping
}

interface VisCommonConfig extends VisCommonParams {
  metrics: Array<ExpressionValueVisDimension | string>;
  metricsToLabels?: string;
  buckets?: Array<ExpressionValueVisDimension | string>;
  splitColumn?: Array<ExpressionValueVisDimension | string>;
  splitRow?: Array<ExpressionValueVisDimension | string>;
  labels: ExpressionValuePartitionLabels;
  palette: PaletteOutput;
}

export interface PartitionVisParams extends VisCommonParams {
  dimensions: Dimensions;
  metricsToLabels: Record<string, string>;
  labels: LabelsParams;
  palette: PaletteOutput;
  isDonut?: boolean;
  showValuesInLegend?: boolean;
  respectSourceOrder?: boolean;
  emptySizeRatio?: EmptySizeRatios;
  startFromSecondLargestSlice?: boolean;
  distinctColors?: boolean;
  nestedLegend?: boolean;
}

export interface PieVisConfig extends VisCommonConfig {
  partitionByColumn?: boolean;
  isDonut: boolean;
  emptySizeRatio?: EmptySizeRatios;
  respectSourceOrder?: boolean;
  startFromSecondLargestSlice?: boolean;
  distinctColors?: boolean;
  nestedLegend: boolean;
}

export interface TreemapVisConfig extends VisCommonConfig {
  nestedLegend: boolean;
}

export interface MosaicVisConfig
  extends Omit<VisCommonConfig, 'metrics' | 'metricsToLabels' | 'colorOverrides'> {
  metric: ExpressionValueVisDimension | string;
  nestedLegend: boolean;
}

export interface WaffleVisConfig extends Omit<VisCommonConfig, 'buckets'> {
  bucket?: ExpressionValueVisDimension | string;
  showValuesInLegend: boolean;
}

export interface PartitionChartProps {
  visData: Datatable;
  visType: ChartTypes;
  visConfig: PartitionVisParams;
  syncColors: boolean;
  canNavigateToLens?: boolean;
  overrides?: AllowedPartitionOverrides & AllowedSettingsOverrides & AllowedChartOverrides;
}

export enum LabelPositions {
  INSIDE = 'inside',
  DEFAULT = 'default',
}

export enum ValueFormats {
  PERCENT = 'percent',
  VALUE = 'value',
}

export enum LegendDisplay {
  SHOW = 'show',
  HIDE = 'hide',
  DEFAULT = 'default',
}

export interface BucketColumns extends DatatableColumn {
  format?: {
    id?: string;
    params?: SerializedFieldFormat;
  };
}

export interface PieContainerDimensions {
  width: number;
  height: number;
}

export interface SplitDimensionParams {
  order?: string;
  orderBy?: string;
}
