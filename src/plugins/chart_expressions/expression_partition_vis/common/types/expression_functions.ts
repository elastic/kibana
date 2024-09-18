/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PartitionProps } from '@elastic/charts';
import type { MakeOverridesSerializable, Simplify } from '@kbn/chart-expressions-common/types';
import {
  ExpressionFunctionDefinition,
  Datatable,
  ExpressionValueRender,
  ExpressionValueBoxed,
} from '@kbn/expressions-plugin/common';
import {
  PARTITION_LABELS_VALUE,
  PIE_VIS_EXPRESSION_NAME,
  TREEMAP_VIS_EXPRESSION_NAME,
  MOSAIC_VIS_EXPRESSION_NAME,
  WAFFLE_VIS_EXPRESSION_NAME,
  PARTITION_LABELS_FUNCTION,
} from '../constants';
import {
  type PartitionChartProps,
  type PieVisConfig,
  LabelPositions,
  ValueFormats,
  type TreemapVisConfig,
  type MosaicVisConfig,
  type WaffleVisConfig,
} from './expression_renderers';

export interface PartitionLabelsArguments {
  show: boolean;
  position: LabelPositions;
  values: boolean;
  valuesFormat: ValueFormats;
  percentDecimals: number;
  colorOverrides?: string;
  /** @deprecated This field is deprecated and going to be removed in the futher release versions. */
  truncate?: number | null;
  /** @deprecated This field is deprecated and going to be removed in the futher release versions. */
  last_level?: boolean;
}

export type ExpressionValuePartitionLabels = ExpressionValueBoxed<
  typeof PARTITION_LABELS_VALUE,
  {
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
>;

export type PieVisExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof PIE_VIS_EXPRESSION_NAME,
  Datatable,
  PieVisConfig,
  ExpressionValueRender<PartitionChartProps>
>;

export type TreemapVisExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof TREEMAP_VIS_EXPRESSION_NAME,
  Datatable,
  TreemapVisConfig,
  ExpressionValueRender<PartitionChartProps>
>;

export type MosaicVisExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof MOSAIC_VIS_EXPRESSION_NAME,
  Datatable,
  MosaicVisConfig,
  ExpressionValueRender<PartitionChartProps>
>;

export type WaffleVisExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof WAFFLE_VIS_EXPRESSION_NAME,
  Datatable,
  WaffleVisConfig,
  ExpressionValueRender<PartitionChartProps>
>;

export enum ChartTypes {
  PIE = 'pie',
  DONUT = 'donut',
  TREEMAP = 'treemap',
  MOSAIC = 'mosaic',
  WAFFLE = 'waffle',
}

export type PartitionLabelsExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof PARTITION_LABELS_FUNCTION,
  Datatable | null,
  PartitionLabelsArguments,
  ExpressionValuePartitionLabels
>;

export type AllowedPartitionOverrides = Partial<
  Record<
    'partition',
    Simplify<
      Omit<
        MakeOverridesSerializable<PartitionProps>,
        'id' | 'data' | 'valueAccessor' | 'valueFormatter' | 'layers' | 'layout'
      >
    >
  >
>;
