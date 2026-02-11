/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CountIndexPatternColumn,
  CardinalityIndexPatternColumn,
  SumIndexPatternColumn,
  MaxIndexPatternColumn,
  MinIndexPatternColumn,
  StandardDeviationIndexPatternColumn,
  MedianIndexPatternColumn,
  AvgIndexPatternColumn,
  StaticValueIndexPatternColumn,
  FormulaIndexPatternColumn,
  LastValueIndexPatternColumn,
  PercentileIndexPatternColumn,
  PercentileRanksIndexPatternColumn,
  MovingAverageIndexPatternColumn,
  DerivativeIndexPatternColumn,
  CounterRateIndexPatternColumn,
  CumulativeSumIndexPatternColumn,
  DateHistogramIndexPatternColumn,
  FiltersIndexPatternColumn,
  RangeIndexPatternColumn,
  TermsIndexPatternColumn,
} from '@kbn/lens-common';

export type AnyMetricLensStateColumn =
  | CountIndexPatternColumn
  | CardinalityIndexPatternColumn
  | SumIndexPatternColumn
  | MaxIndexPatternColumn
  | MinIndexPatternColumn
  | StandardDeviationIndexPatternColumn
  | MedianIndexPatternColumn
  | AvgIndexPatternColumn
  | StaticValueIndexPatternColumn
  | FormulaIndexPatternColumn
  | LastValueIndexPatternColumn
  | PercentileIndexPatternColumn
  | PercentileRanksIndexPatternColumn
  | MovingAverageIndexPatternColumn
  | DerivativeIndexPatternColumn
  | CounterRateIndexPatternColumn
  | CumulativeSumIndexPatternColumn;

export type ReferableMetricLensStateColumn =
  | CountIndexPatternColumn
  | CardinalityIndexPatternColumn
  | SumIndexPatternColumn
  | MaxIndexPatternColumn
  | MinIndexPatternColumn
  | StandardDeviationIndexPatternColumn
  | MedianIndexPatternColumn
  | AvgIndexPatternColumn
  | LastValueIndexPatternColumn
  | PercentileIndexPatternColumn
  | PercentileRanksIndexPatternColumn;

export type AnyBucketLensStateColumn =
  | DateHistogramIndexPatternColumn
  | FiltersIndexPatternColumn
  | RangeIndexPatternColumn
  | TermsIndexPatternColumn;

export type AnyLensStateColumn = AnyMetricLensStateColumn | AnyBucketLensStateColumn;
export type ReferenceMetricLensStateColumn = Exclude<
  AnyLensStateColumn,
  ReferableMetricLensStateColumn | AnyBucketLensStateColumn
>;

export interface APIDataView {
  type: 'dataView';
  id: string;
}

export interface APIAdHocDataView {
  type: 'adHocDataView';
  index: string;
  timeFieldName: string | undefined;
}
