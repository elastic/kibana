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
import { ExpressionValuePieLabels } from './expression_functions';

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
  metric: ExpressionValueVisDimension;
  buckets?: ExpressionValueVisDimension[];
  splitRow?: ExpressionValueVisDimension[];
  splitColumn?: ExpressionValueVisDimension[];
}

export interface LabelsParams {
  show: boolean;
  last_level: boolean;
  position: LabelPositions;
  values: boolean;
  truncate: number | null;
  valuesFormat: ValueFormats;
  percentDecimals: number;
}

interface PieCommonParams {
  addTooltip: boolean;
  addLegend: boolean;
  legendPosition: Position;
  nestedLegend: boolean;
  truncateLegend: boolean;
  maxLegendLines: number;
  distinctColors: boolean;
  isDonut: boolean;
  emptySizeRatio?: EmptySizeRatios;
}

export interface PieVisParams extends PieCommonParams {
  dimensions: Dimensions;
  labels: LabelsParams;
  palette: PaletteOutput;
}

export interface PieVisConfig extends PieCommonParams {
  buckets?: ExpressionValueVisDimension[];
  metric: ExpressionValueVisDimension;
  splitColumn?: ExpressionValueVisDimension[];
  splitRow?: ExpressionValueVisDimension[];
  labels: ExpressionValuePieLabels;
  palette: PaletteOutput;
}

export interface RenderValue {
  visData: Datatable;
  visType: string;
  visConfig: PieVisParams;
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
