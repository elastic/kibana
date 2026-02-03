/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { NavigateToLensLayer as BaseLayer } from '@kbn/lens-common';
import type {
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
  CounterRateColumn as BaseCounterRateColumn,
  StandardDeviationColumn as BaseStandardDeviationColumn,
  StaticValueColumn as BaseStaticValueColumn,
  RangeColumn as BaseRangeColumn,
  TermsColumn,
  FiltersColumn,
  DateHistogramColumn,
  AnyColumnWithReferences as BaseAnyColumnWithReferences,
} from '@kbn/visualizations-plugin/common';
import type { Metric, Series } from '../../../../common/types';

export interface Meta {
  metricId: string;
}

export type PercentileMeta = {
  reference: `${string}.${number}`;
} & Meta;

export type PercentileColumnWithCommonMeta = GenericColumnWithMeta<BasePercentileColumn, Meta>;
export type PercentileColumnWithExtendedMeta = GenericColumnWithMeta<
  BasePercentileColumn,
  PercentileMeta
>;
export type PercentileColumn = PercentileColumnWithCommonMeta | PercentileColumnWithExtendedMeta;

export type PercentileRanksColumnWithCommonMeta = GenericColumnWithMeta<
  BasePercentileRanksColumn,
  Meta
>;
export type PercentileRanksColumnWithExtendedMeta = GenericColumnWithMeta<
  BasePercentileRanksColumn,
  PercentileMeta
>;

export type PercentileRanksColumn =
  | PercentileRanksColumnWithCommonMeta
  | PercentileRanksColumnWithExtendedMeta;

export type CommonPercentileColumnWithExtendedMeta =
  | PercentileColumnWithExtendedMeta
  | PercentileRanksColumnWithExtendedMeta;

export type RangeColumn = GenericColumnWithMeta<BaseRangeColumn, Meta>;
export type MinColumn = GenericColumnWithMeta<BaseMinColumn, Meta>;
export type MaxColumn = GenericColumnWithMeta<BaseMaxColumn, Meta>;
export type AvgColumn = GenericColumnWithMeta<BaseAvgColumn, Meta>;
export type SumColumn = GenericColumnWithMeta<BaseSumColumn, Meta>;
export type MedianColumn = GenericColumnWithMeta<BaseMedianColumn, Meta>;
export type StandardDeviationColumn = GenericColumnWithMeta<BaseStandardDeviationColumn, Meta>;
export type CardinalityColumn = GenericColumnWithMeta<BaseCardinalityColumn, Meta>;
export type CountColumn = GenericColumnWithMeta<BaseCountColumn, Meta>;
export type LastValueColumn = GenericColumnWithMeta<BaseLastValueColumn, Meta>;
export type CumulativeSumColumn = GenericColumnWithMeta<BaseCumulativeSumColumn, Meta>;
export type CounterRateColumn = GenericColumnWithMeta<BaseCounterRateColumn, Meta>;
export type DerivativeColumn = GenericColumnWithMeta<BaseDerivativeColumn, Meta>;
export type MovingAverageColumn = GenericColumnWithMeta<BaseMovingAverageColumn, Meta>;
export type FormulaColumn = GenericColumnWithMeta<BaseFormulaColumn, Meta>;
export type StaticValueColumn = GenericColumnWithMeta<BaseStaticValueColumn, Meta>;

export type ColumnsWithoutMeta =
  | FiltersColumn
  | TermsColumn
  | DateHistogramColumn
  | BaseStaticValueColumn
  | BaseFormulaColumn;

export type AnyColumnWithReferences = GenericColumnWithMeta<BaseAnyColumnWithReferences, Meta>;

type CommonColumns = Exclude<BaseColumn, ColumnsWithoutMeta>;
export type ColumnWithMeta =
  | GenericColumnWithMeta<CommonColumns, Meta>
  | CommonPercentileColumnWithExtendedMeta;

export type Column = ColumnWithMeta | ColumnsWithoutMeta;

export type Layer = Omit<BaseLayer, 'columns'> & {
  columns: Column[];
};

export interface CommonColumnsConverterArgs {
  series: Series;
  metrics: [Metric, ...Metric[]];
  dataView: DataView;
}

export interface CommonColumnConverterArgs {
  series: Series;
  metric: Metric;
  dataView: DataView;
}

export type TermsSeries = Pick<
  Series,
  | 'split_mode'
  | 'terms_direction'
  | 'terms_order_by'
  | 'terms_size'
  | 'terms_include'
  | 'terms_exclude'
  | 'terms_field'
  | 'formatter'
  | 'value_template'
>;

export type FiltersSeries = Pick<Series, 'split_mode' | 'filter' | 'split_filters'>;

export type DateHistogramSeries = Pick<
  Series,
  'split_mode' | 'override_index_pattern' | 'series_interval' | 'series_drop_last_bucket'
>;

export type { FiltersColumn, TermsColumn, DateHistogramColumn };
