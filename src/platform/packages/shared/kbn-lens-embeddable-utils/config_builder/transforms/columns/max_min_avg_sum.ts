/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AvgIndexPatternColumn,
  MaxIndexPatternColumn,
  MedianIndexPatternColumn,
  MinIndexPatternColumn,
  StandardDeviationIndexPatternColumn,
  SumIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';
import { getLensStateMetricSharedProps, getLensAPIMetricSharedProps } from './utils';
import type { LensApiMetricOperation, LensApiSumMetricOperation } from '../../schema/metric_ops';

function ofName(
  field: string,
  operation: 'min' | 'max' | 'average' | 'sum' | 'median' | 'standard_deviation'
): string {
  switch (operation) {
    case 'min':
      return `Minimum of ${field}`;
    case 'max':
      return `Maximum of ${field}`;
    case 'average':
      return `Average of ${field}`;
    case 'sum':
      return `Sum of ${field}`;
    case 'median':
      return `Median of ${field}`;
    case 'standard_deviation':
      return `Standard Deviation of ${field}`;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

export function fromBasicMetricAPItoLensState(
  options: LensApiMetricOperation
):
  | StandardDeviationIndexPatternColumn
  | MinIndexPatternColumn
  | MaxIndexPatternColumn
  | AvgIndexPatternColumn
  | MedianIndexPatternColumn {
  const { field, format } = options;

  return {
    operationType: options.operation,
    sourceField: field,
    ...getLensStateMetricSharedProps(options, ofName(field, options.operation)),
    params: {
      ...(format ? { format: fromFormatAPIToLensState(format) } : {}),
    },
  };
}

export function fromSumMetricAPIToLensState(
  options: LensApiSumMetricOperation
): SumIndexPatternColumn {
  const { field, format } = options;

  return {
    operationType: 'sum',
    sourceField: field,
    ...getLensStateMetricSharedProps(options, ofName(field, 'sum')),
    params: {
      ...(format ? { format: fromFormatAPIToLensState(format) } : {}),
    },
  };
}

export function fromBasicMetricLensStateToAPI(
  options:
    | StandardDeviationIndexPatternColumn
    | MinIndexPatternColumn
    | MaxIndexPatternColumn
    | AvgIndexPatternColumn
    | MedianIndexPatternColumn
): LensApiMetricOperation {
  return {
    operation: options.operationType,
    field: options.sourceField,
    ...getLensAPIMetricSharedProps(options, ofName(options.sourceField, options.operationType)),
    ...(options.params?.format ? { format: fromFormatLensStateToAPI(options.params.format) } : {}),
  };
}

export function fromSumMetricLensStateToAPI(
  options: SumIndexPatternColumn
): LensApiSumMetricOperation {
  return {
    operation: 'sum',
    field: options.sourceField,
    empty_as_null: Boolean(options.params?.emptyAsNull),
    ...getLensAPIMetricSharedProps(options, ofName(options.sourceField, 'sum')),
    ...(options.params?.format ? { format: fromFormatLensStateToAPI(options.params.format) } : {}),
  };
}
