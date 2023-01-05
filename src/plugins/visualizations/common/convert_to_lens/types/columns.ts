/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataType, FilterQuery, TimeScaleUnit } from './common';
import { Operation, OperationWithReferences, OperationWithSourceField } from './operations';
import {
  AvgParams,
  CardinalityParams,
  DateHistogramParams,
  FiltersParams,
  MaxParams,
  MedianParams,
  MinParams,
  RangeParams,
  StandardDeviationParams,
  SumParams,
  TermsParams,
  PercentileParams,
  PercentileRanksParams,
  CountParams,
  LastValueParams,
  CumulativeSumParams,
  CounterRateParams,
  DerivativeParams,
  MovingAverageParams,
  FormulaParams,
  StaticValueParams,
} from './params';

export interface BaseColumn<OperationType extends Operation, Params = undefined> {
  columnId: string;
  operationType: OperationType;
  label?: string;
  isBucketed: boolean;
  isSplit: boolean;
  dataType: DataType;
  timeScale?: TimeScaleUnit; // ?
  timeShift?: string;
  reducedTimeRange?: string;
  isStaticValue?: boolean;
  filter?: FilterQuery;
  params: Params;
}

export interface ColumnWithSourceField<Op extends OperationWithSourceField, Params = undefined>
  extends BaseColumn<Op, Params> {
  sourceField: string;
}

export interface ColumnWithReferences<Op extends OperationWithReferences, Params = undefined>
  extends BaseColumn<Op, Params> {
  references: string[];
}

export type FiltersColumn = BaseColumn<'filters', FiltersParams>;
export type RangeColumn = ColumnWithSourceField<'range', RangeParams>;
export type TermsColumn = ColumnWithSourceField<'terms', TermsParams>;
export type DateHistogramColumn = ColumnWithSourceField<'date_histogram', DateHistogramParams>;
export type MinColumn = ColumnWithSourceField<'min', MinParams>;
export type MaxColumn = ColumnWithSourceField<'max', MaxParams>;
export type AvgColumn = ColumnWithSourceField<'average', AvgParams>;
export type SumColumn = ColumnWithSourceField<'sum', SumParams>;
export type MedianColumn = ColumnWithSourceField<'median', MedianParams>;
export type StandardDeviationColumn = ColumnWithSourceField<
  'standard_deviation',
  StandardDeviationParams
>;
export type CardinalityColumn = ColumnWithSourceField<'unique_count', CardinalityParams>;
export type PercentileColumn = ColumnWithSourceField<'percentile', PercentileParams>;
export type PercentileRanksColumn = ColumnWithSourceField<'percentile_rank', PercentileRanksParams>;
export type CountColumn = ColumnWithSourceField<'count', CountParams>;
export type LastValueColumn = ColumnWithSourceField<'last_value', LastValueParams>;

export type CumulativeSumColumn = ColumnWithReferences<'cumulative_sum', CumulativeSumParams>;
export type CounterRateColumn = ColumnWithReferences<'counter_rate', CounterRateParams>;
export type DerivativeColumn = ColumnWithReferences<'differences', DerivativeParams>;
export type MovingAverageColumn = ColumnWithReferences<'moving_average', MovingAverageParams>;
export type FormulaColumn = ColumnWithReferences<'formula', FormulaParams>;
export type StaticValueColumn = ColumnWithReferences<'static_value', StaticValueParams>;

export type AnyColumnWithSourceField =
  | RangeColumn
  | TermsColumn
  | DateHistogramColumn
  | MinColumn
  | MaxColumn
  | AvgColumn
  | SumColumn
  | MedianColumn
  | StandardDeviationColumn
  | CardinalityColumn
  | PercentileColumn
  | PercentileRanksColumn
  | CountColumn
  | LastValueColumn;

export type AnyColumnWithReferences =
  | CumulativeSumColumn
  | CounterRateColumn
  | DerivativeColumn
  | MovingAverageColumn
  | FormulaColumn
  | StaticValueColumn;

export type Column = AnyColumnWithReferences | AnyColumnWithSourceField | FiltersColumn;

export type GenericColumnWithMeta<
  Col extends Column | {},
  Meta extends {} | unknown = undefined
> = Col & (Meta extends undefined ? undefined : { meta: Meta });

export type ColumnWithMeta = GenericColumnWithMeta<Column, unknown>;
