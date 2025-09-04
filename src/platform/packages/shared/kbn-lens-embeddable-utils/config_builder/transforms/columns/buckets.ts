/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DateHistogramIndexPatternColumn,
  FiltersIndexPatternColumn,
  RangeIndexPatternColumn,
  TermsIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import type {
  LensApiBucketOperations,
  LensApiDateHistogramOperation,
  LensApiFiltersOperation,
  LensApiRangeOperation,
  LensApiTermsOperation,
} from '../../schema/bucket_ops';
import { isAPIColumnOfType, isLensStateColumnOfType } from './utils';
import { fromFiltersLensApiToLensState, fromFiltersLensStateToAPI } from './filters';
import {
  fromDateHistogramLensApiToLensState,
  fromDateHistogramLensStateToAPI,
} from './date_histogram';
import {
  fromRangeOrHistogramLensApiToLensState,
  fromRangeOrHistogramLensStateToAPI,
} from './range';
import { fromTermsLensApiToLensState, fromTermsLensStateToAPI } from './top_values';
import type { AnyBucketLensStateColumn, AnyMetricLensStateColumn } from './types';
import type { LensApiAllMetricOperations } from '../../schema/metric_ops';

export function fromBucketLensApiToLensState(
  options: LensApiFiltersOperation,
  columns: { column: AnyMetricLensStateColumn; id: string }[]
): FiltersIndexPatternColumn;
export function fromBucketLensApiToLensState(
  options: LensApiTermsOperation,
  columns: { column: AnyMetricLensStateColumn; id: string }[]
): TermsIndexPatternColumn;
export function fromBucketLensApiToLensState(
  options: LensApiRangeOperation,
  columns: { column: AnyMetricLensStateColumn; id: string }[]
): RangeIndexPatternColumn;
export function fromBucketLensApiToLensState(
  options: LensApiDateHistogramOperation,
  columns: { column: AnyMetricLensStateColumn; id: string }[]
): DateHistogramIndexPatternColumn;
export function fromBucketLensApiToLensState(
  options: LensApiBucketOperations,
  columns: { column: AnyMetricLensStateColumn; id: string }[]
): AnyBucketLensStateColumn | undefined {
  if (isAPIColumnOfType<LensApiFiltersOperation>('filters', options)) {
    return fromFiltersLensApiToLensState(options);
  }
  if (isAPIColumnOfType<LensApiDateHistogramOperation>('date_histogram', options)) {
    return fromDateHistogramLensApiToLensState(options);
  }
  if (isAPIColumnOfType<LensApiRangeOperation>('range', options)) {
    return fromRangeOrHistogramLensApiToLensState(options);
  }
  if (isAPIColumnOfType<LensApiTermsOperation>('terms', options)) {
    const findByIndex = (index: number) => columns[index]?.id;
    return fromTermsLensApiToLensState(options, findByIndex);
  }
  throw new Error(`Unsupported bucket operation`);
}

export function fromBucketLensStateToAPI(
  column: FiltersIndexPatternColumn,
  columns: { column: LensApiAllMetricOperations; id: string }[]
): LensApiFiltersOperation;
export function fromBucketLensStateToAPI(
  column: DateHistogramIndexPatternColumn,
  columns: { column: LensApiAllMetricOperations; id: string }[]
): LensApiDateHistogramOperation;
export function fromBucketLensStateToAPI(
  column: RangeIndexPatternColumn,
  columns: { column: LensApiAllMetricOperations; id: string }[]
): LensApiRangeOperation;
export function fromBucketLensStateToAPI(
  column: TermsIndexPatternColumn,
  columns: { column: LensApiAllMetricOperations; id: string }[]
): LensApiTermsOperation;
export function fromBucketLensStateToAPI(
  column: AnyBucketLensStateColumn,
  columns: { column: LensApiAllMetricOperations; id: string }[]
): LensApiBucketOperations | undefined {
  if (isLensStateColumnOfType<FiltersIndexPatternColumn>('filters', column)) {
    return fromFiltersLensStateToAPI(column);
  }
  if (isLensStateColumnOfType<DateHistogramIndexPatternColumn>('date_histogram', column)) {
    return fromDateHistogramLensStateToAPI(column);
  }
  if (isLensStateColumnOfType<RangeIndexPatternColumn>('range', column)) {
    return fromRangeOrHistogramLensStateToAPI(column);
  }
  if (isLensStateColumnOfType<TermsIndexPatternColumn>('terms', column)) {
    return fromTermsLensStateToAPI(
      column,
      columns.map(({ column: c, id }) => ({ ...c, id }))
    );
  }
  throw new Error(`Unsupported bucket operation`);
}
