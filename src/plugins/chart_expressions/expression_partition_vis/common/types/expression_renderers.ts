/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Position } from '@elastic/charts';
import { Datatable, DatatableColumn } from '../../../../expressions/common';
import { SerializedFieldFormat } from '../../../../field_formats/common';
import { ExpressionValueVisDimension } from '../../../../visualizations/common';
import { PaletteOutput } from '../../../../charts/common';
import { ChartTypes, ExpressionValuePartitionLabels } from './expression_functions';

export enum EmptySizeRatios {
  SMALL = 0.3,
  MEDIUM = 0.54,
  LARGE = 0.7,
}

export interface Dimension {
  accessor: number;
  format: {
    id?: string;
    params?: SerializedFieldFormat<object>;
  };
}

export interface Dimensions {
  metric?: ExpressionValueVisDimension | string;
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
  legendSize?: number;
  ariaLabel?: string;
}

interface VisCommonConfig extends VisCommonParams {
  metric: ExpressionValueVisDimension | string;
  splitColumn?: Array<ExpressionValueVisDimension | string>;
  splitRow?: Array<ExpressionValueVisDimension | string>;
  labels: ExpressionValuePartitionLabels;
  palette: PaletteOutput;
}

export interface PartitionVisParams extends VisCommonParams {
  dimensions: Dimensions;
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
  buckets?: Array<ExpressionValueVisDimension | string>;
  isDonut: boolean;
  emptySizeRatio?: EmptySizeRatios;
  respectSourceOrder?: boolean;
  startFromSecondLargestSlice?: boolean;
  distinctColors?: boolean;
  nestedLegend: boolean;
}

export interface TreemapVisConfig extends VisCommonConfig {
  buckets?: Array<ExpressionValueVisDimension | string>;
  nestedLegend: boolean;
}

export interface MosaicVisConfig extends VisCommonConfig {
  buckets?: Array<ExpressionValueVisDimension | string>;
  nestedLegend: boolean;
}

export interface WaffleVisConfig extends VisCommonConfig {
  bucket?: ExpressionValueVisDimension | string;
  showValuesInLegend: boolean;
}

export interface RenderValue {
  visData: Datatable;
  visType: ChartTypes;
  visConfig: PartitionVisParams;
  syncColors: boolean;
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
    params?: SerializedFieldFormat<object>;
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
