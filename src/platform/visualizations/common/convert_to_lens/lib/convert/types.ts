/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import { SchemaConfig, SupportedAggregation } from '../../../types';
import {
  Operation,
  BaseColumn as GenericBaseColumn,
  Column as BaseColumn,
  GenericColumnWithMeta,
  PercentileColumn as BasePercentileColumn,
  PercentileRanksColumn as BasePercentileRanksColumn,
  FormulaColumn as BaseFormulaColumn,
  LastValueColumn as BaseLastValueColumn,
  AvgColumn as BaseAvgColumn,
  CountColumn as BaseCountColumn,
  CardinalityColumn as BaseCardinalityColumn,
  MaxColumn as BaseMaxColumn,
  MedianColumn as BaseMedianColumn,
  MinColumn as BaseMinColumn,
  SumColumn as BaseSumColumn,
  CumulativeSumColumn as BaseCumulativeSumColumn,
  MovingAverageColumn as BaseMovingAverageColumn,
  DerivativeColumn as BaseDerivativeColumn,
  DateHistogramColumn as BaseDateHistogramColumn,
  TermsColumn as BaseTermsColumn,
  FiltersColumn as BaseFiltersColumn,
  RangeColumn as BaseRangeColumn,
} from '../../types';

export type MetricsWithField = Exclude<
  METRIC_TYPES,
  | METRIC_TYPES.FILTERED_METRIC
  | METRIC_TYPES.AVG_BUCKET
  | METRIC_TYPES.SUM_BUCKET
  | METRIC_TYPES.MAX_BUCKET
  | METRIC_TYPES.MIN_BUCKET
  | METRIC_TYPES.MOVING_FN
  | METRIC_TYPES.CUMULATIVE_SUM
  | METRIC_TYPES.DERIVATIVE
  | METRIC_TYPES.SERIAL_DIFF
  | METRIC_TYPES.COUNT
>;

export type OtherParentPipelineAggs = METRIC_TYPES.DERIVATIVE | METRIC_TYPES.MOVING_FN;

export type ParentPipelineMetric = METRIC_TYPES.CUMULATIVE_SUM | OtherParentPipelineAggs;

export type SiblingPipelineMetric =
  | METRIC_TYPES.AVG_BUCKET
  | METRIC_TYPES.SUM_BUCKET
  | METRIC_TYPES.MIN_BUCKET
  | METRIC_TYPES.MAX_BUCKET;

export type BucketColumn = DateHistogramColumn | TermsColumn | FiltersColumn | RangeColumn;
export interface CommonColumnConverterArgs<
  Agg extends SupportedAggregation = SupportedAggregation
> {
  agg: SchemaConfig<Agg>;
  dataView: DataView;
  visType: string;
}

export interface ExtendedColumnConverterArgs<
  Agg extends SupportedAggregation = SupportedAggregation
> extends CommonColumnConverterArgs<Agg> {
  aggs: Array<SchemaConfig<METRIC_TYPES>>;
}

export interface CommonBucketConverterArgs<
  Agg extends SupportedAggregation = SupportedAggregation
> {
  visType: string;
  agg: SchemaConfig<Agg>;
  dataView: DataView;
  metricColumns: AggBasedColumn[];
  aggs: Array<SchemaConfig<METRIC_TYPES>>;
}

export type AggId = `${string}`;

export interface Meta {
  aggId: AggId;
}

export type GeneralColumn = Omit<GenericBaseColumn<Operation, unknown>, 'operationType' | 'params'>;
export type GeneralColumnWithMeta = GenericColumnWithMeta<GeneralColumn, Meta>;
export interface ExtraColumnFields {
  isBucketed?: boolean;
  isSplit?: boolean;
  reducedTimeRange?: string;
}

export type PercentileColumn = GenericColumnWithMeta<BasePercentileColumn, Meta>;
export type PercentileRanksColumn = GenericColumnWithMeta<BasePercentileRanksColumn, Meta>;

export type AggBasedColumn = GenericColumnWithMeta<BaseColumn, Meta> | BucketColumn;

export type FormulaColumn = GenericColumnWithMeta<BaseFormulaColumn, Meta>;
export type LastValueColumn = GenericColumnWithMeta<BaseLastValueColumn, Meta>;
export type AvgColumn = GenericColumnWithMeta<BaseAvgColumn, Meta>;
export type CountColumn = GenericColumnWithMeta<BaseCountColumn, Meta>;
export type CardinalityColumn = GenericColumnWithMeta<BaseCardinalityColumn, Meta>;
export type MaxColumn = GenericColumnWithMeta<BaseMaxColumn, Meta>;
export type MedianColumn = GenericColumnWithMeta<BaseMedianColumn, Meta>;
export type MinColumn = GenericColumnWithMeta<BaseMinColumn, Meta>;
export type SumColumn = GenericColumnWithMeta<BaseSumColumn, Meta>;
export type CumulativeSumColumn = GenericColumnWithMeta<BaseCumulativeSumColumn, Meta>;
export type MovingAverageColumn = GenericColumnWithMeta<BaseMovingAverageColumn, Meta>;
export type DerivativeColumn = GenericColumnWithMeta<BaseDerivativeColumn, Meta>;
export type DateHistogramColumn = GenericColumnWithMeta<BaseDateHistogramColumn, Meta>;
export type TermsColumn = GenericColumnWithMeta<BaseTermsColumn, Meta>;
export type FiltersColumn = GenericColumnWithMeta<BaseFiltersColumn, Meta>;
export type RangeColumn = GenericColumnWithMeta<BaseRangeColumn, Meta>;
