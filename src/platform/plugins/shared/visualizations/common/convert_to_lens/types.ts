/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { $Values } from '@kbn/utility-types';
import type {
  AvgIndexPatternColumn,
  CardinalityIndexPatternColumn,
  CountIndexPatternColumn,
  CounterRateIndexPatternColumn,
  CumulativeSumIndexPatternColumn,
  DataType,
  DateHistogramIndexPatternColumn,
  DerivativeIndexPatternColumn,
  FiltersIndexPatternColumn,
  FormulaIndexPatternColumn,
  GenericIndexPatternColumn,
  LastValueIndexPatternColumn,
  MaxIndexPatternColumn,
  MedianIndexPatternColumn,
  MinIndexPatternColumn,
  MovingAverageIndexPatternColumn,
  PercentileIndexPatternColumn,
  PercentileRanksIndexPatternColumn,
  RangeIndexPatternColumn,
  StandardDeviationIndexPatternColumn,
  StaticValueIndexPatternColumn,
  SumIndexPatternColumn,
  TermsIndexPatternColumn,
  TimeScaleUnit,
  ValueFormatConfig,
} from '@kbn/lens-common';
import type { Query } from '@kbn/es-query';
import type { Operations, OperationsWithSourceField, OperationsWithReferences } from './constants';

export interface MinMax {
  min: number;
  max: number;
}

export interface BasicFullPercentageModeConfig {
  isPercentageMode: boolean;
}

export interface BasicPercentageModeConfig {
  isPercentageMode: false;
}

export type PercentageModeConfigWithMinMax = BasicFullPercentageModeConfig & MinMax;

export type PercentageModeConfig = BasicPercentageModeConfig | PercentageModeConfigWithMinMax;

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
  filter?: Query;
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

export type ToBaseColumnFormat<Col extends GenericIndexPatternColumn> = {
  columnId: string;
  isSplit: boolean;
} & Omit<Col, 'label'> & { label?: string };

export type FiltersColumn = ToBaseColumnFormat<FiltersIndexPatternColumn>;
export type RangeColumn = ToBaseColumnFormat<RangeIndexPatternColumn>;
// Need special care for Terms as it can declare a nested agg inside
export type TermsColumn = ToBaseColumnFormat<
  Omit<TermsIndexPatternColumn, 'params'> & {
    params: Omit<TermsIndexPatternColumn['params'], 'orderAgg'> & {
      // Due to an existing bug we have to relax the checks here
      // and allow even a formula column to be passed as orderAgg
      // Lens will ignore it on the other end anyway
      orderAgg?: AnyMetricColumn;
    };
  }
>;
export type DateHistogramColumn = ToBaseColumnFormat<DateHistogramIndexPatternColumn>;
export type MinColumn = ToBaseColumnFormat<MinIndexPatternColumn>;
export type MaxColumn = ToBaseColumnFormat<MaxIndexPatternColumn>;
export type AvgColumn = ToBaseColumnFormat<AvgIndexPatternColumn>;
export type SumColumn = ToBaseColumnFormat<SumIndexPatternColumn>;
export type MedianColumn = ToBaseColumnFormat<MedianIndexPatternColumn>;
export type StandardDeviationColumn = ToBaseColumnFormat<StandardDeviationIndexPatternColumn>;
export type CardinalityColumn = ToBaseColumnFormat<CardinalityIndexPatternColumn>;
export type PercentileColumn = ToBaseColumnFormat<PercentileIndexPatternColumn>;
export type PercentileRanksColumn = ToBaseColumnFormat<PercentileRanksIndexPatternColumn>;
export type CountColumn = ToBaseColumnFormat<CountIndexPatternColumn>;
export type LastValueColumn = Omit<ToBaseColumnFormat<LastValueIndexPatternColumn>, 'params'> & {
  params: Omit<LastValueIndexPatternColumn['params'], 'sortField'> & { sortField?: string };
};

export type CumulativeSumColumn = ToBaseColumnFormat<CumulativeSumIndexPatternColumn>;
export type CounterRateColumn = ToBaseColumnFormat<CounterRateIndexPatternColumn>;
export type DerivativeColumn = ToBaseColumnFormat<DerivativeIndexPatternColumn>;
export type MovingAverageColumn = ToBaseColumnFormat<MovingAverageIndexPatternColumn>;
export type FormulaColumn = ToBaseColumnFormat<FormulaIndexPatternColumn>;
export type StaticValueColumn = ToBaseColumnFormat<StaticValueIndexPatternColumn>;

export type TermsParams = TermsColumn['params'];
export type DateHistogramParams = DateHistogramColumn['params'];
export type MinParams = MinColumn['params'];
export type MaxParams = MaxColumn['params'];
export type AvgParams = AvgColumn['params'];
export type SumParams = SumColumn['params'];
export type MedianParams = MedianColumn['params'];
export type StandardDeviationParams = StandardDeviationColumn['params'];
export type CardinalityParams = CardinalityColumn['params'];
export type PercentileParams = PercentileColumn['params'];
export type PercentileRanksParams = PercentileRanksColumn['params'];
export type CountParams = CountColumn['params'];
export type LastValueParams = LastValueColumn['params'];
export type CumulativeSumParams = CumulativeSumColumn['params'];
export type CounterRateParams = CounterRateColumn['params'];
export type DerivativeParams = DerivativeColumn['params'];
export type MovingAverageParams = MovingAverageColumn['params'];
export type FormulaParams = FormulaColumn['params'];
export type StaticValueParams = StaticValueColumn['params'];
export type RangeParams = RangeColumn['params'];
export type TimeScaleParams = GenericIndexPatternColumn['timeScale'];
export type FiltersParams = FiltersColumn['params'];
export interface FormatParams {
  format?: ValueFormatConfig;
}

export type AnyColumnWithSourceField =
  | RangeColumn
  | TermsColumn
  | DateHistogramColumn
  | AnyMetricColumnWithSourceField;

export type AnyMetricColumnWithSourceField =
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

export type AnyMetricColumn = AnyMetricColumnWithSourceField | AnyColumnWithReferences;

export type Column = AnyColumnWithReferences | AnyColumnWithSourceField | FiltersColumn;

export type GenericColumnWithMeta<
  Col extends Column | {},
  MetaData extends {} | unknown = undefined
> = Col & (MetaData extends undefined ? undefined : { meta: MetaData });

export type AggId = `${string}`;
export interface Meta {
  aggId: AggId;
}

export type ColumnWithMeta = GenericColumnWithMeta<Column, Meta>;
export type AnyMetricColumnAndMeta = GenericColumnWithMeta<AnyMetricColumn, Meta>;
export type AnyMetricColumnWithSourceFieldWithMeta = GenericColumnWithMeta<
  AnyMetricColumnWithSourceField,
  Meta
>;
export type AnyBucketColumnWithMeta = GenericColumnWithMeta<
  DateHistogramColumn | TermsColumn | FiltersColumn | RangeColumn,
  Meta
>;

export type Operation = $Values<typeof Operations>;
export type OperationWithSourceField = $Values<typeof OperationsWithSourceField>;
export type OperationWithReferences = $Values<typeof OperationsWithReferences>;
