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
} from '@kbn/lens-common';
import type {
  LensApiBucketOperations,
  LensApiDateHistogramOperation,
  LensApiFiltersOperation,
  LensApiHistogramOperation,
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
import type {
  AnyBucketLensStateColumn,
  AnyLensStateColumn,
  AnyMetricLensStateColumn,
} from './types';

export function fromBucketLensApiToLensState(
  options: LensApiBucketOperations,
  columns: { column: AnyMetricLensStateColumn; id: string }[]
): AnyBucketLensStateColumn {
  if (isAPIColumnOfType<LensApiFiltersOperation>('filters', options)) {
    return fromFiltersLensApiToLensState(options);
  }
  if (isAPIColumnOfType<LensApiDateHistogramOperation>('date_histogram', options)) {
    return fromDateHistogramLensApiToLensState(options);
  }
  if (
    isAPIColumnOfType<LensApiRangeOperation>('range', options) ||
    isAPIColumnOfType<LensApiHistogramOperation>('histogram', options)
  ) {
    return fromRangeOrHistogramLensApiToLensState(options);
  }
  if (isAPIColumnOfType<LensApiTermsOperation>('terms', options)) {
    const findByIndex = (index: number) => columns[index]?.id;
    return fromTermsLensApiToLensState(options, findByIndex);
  }
  // @ts-expect-error This should never happen if the types are correct
  throw new Error(`Unsupported bucket operation: "${options.operation}"`);
}

export function fromBucketLensStateToAPI(
  column: AnyBucketLensStateColumn,
  columns: { column: AnyLensStateColumn; id: string }[]
): LensApiBucketOperations {
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
    return fromTermsLensStateToAPI(column, columns);
  }
  // @ts-expect-error This should never happen if the types are correct
  throw new Error(`Unsupported bucket operation: "${column.operationType}"`);
}
