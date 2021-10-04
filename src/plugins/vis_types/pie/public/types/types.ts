/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Position } from '@elastic/charts';
import { UiCounterMetricType } from '@kbn/analytics';
import { DatatableColumn, SerializedFieldFormat } from '../../../../expressions/public';
import { ExpressionValueVisDimension } from '../../../../visualizations/public';
import { ExpressionValuePieLabels } from '../expression_functions/pie_labels';
import { PaletteOutput, ChartsPluginSetup } from '../../../../charts/public';

export interface Dimension {
  accessor: number;
  format: {
    id?: string;
    params?: SerializedFieldFormat<object>;
  };
}

export interface Dimensions {
  metric: Dimension;
  buckets?: Dimension[];
  splitRow?: Dimension[];
  splitColumn?: Dimension[];
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
  palette: string;
}

export interface BucketColumns extends DatatableColumn {
  format?: {
    id?: string;
    params?: SerializedFieldFormat<object>;
  };
}

export enum LabelPositions {
  INSIDE = 'inside',
  DEFAULT = 'default',
}

export enum ValueFormats {
  PERCENT = 'percent',
  VALUE = 'value',
}

export interface PieTypeProps {
  showElasticChartsOptions?: boolean;
  palettes?: ChartsPluginSetup['palettes'];
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
}

export interface SplitDimensionParams {
  order?: string;
  orderBy?: string;
}

export interface PieContainerDimensions {
  width: number;
  height: number;
}
