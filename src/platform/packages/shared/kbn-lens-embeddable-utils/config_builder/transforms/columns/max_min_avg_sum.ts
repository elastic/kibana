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
} from '@kbn/lens-common';
import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';
import { getLensStateMetricSharedProps, getLensAPIMetricSharedProps } from './utils';
import type { LensApiMetricOperation, LensApiSumMetricOperation } from '../../schema/metric_ops';

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
    ...getLensStateMetricSharedProps(options),
    ...(format ? { params: { format: fromFormatAPIToLensState(format) } } : {}),
  };
}

export function fromSumMetricAPIToLensState(
  options: LensApiSumMetricOperation
): SumIndexPatternColumn {
  const { field, format, empty_as_null } = options;

  return {
    operationType: 'sum',
    sourceField: field,
    ...getLensStateMetricSharedProps(options),
    params: {
      emptyAsNull: Boolean(empty_as_null),
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
    ...getLensAPIMetricSharedProps(options),
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
    ...getLensAPIMetricSharedProps(options),
    ...(options.params?.format ? { format: fromFormatLensStateToAPI(options.params.format) } : {}),
  };
}
