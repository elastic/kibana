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
  MinIndexPatternColumn,
  SumIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import { ValueFormatConfig } from '@kbn/lens-plugin/common';
import { LensApiMetricOperation } from '../schema/metric_ops';

const convertFormat = (format: LensApiMetricOperation['format']) => {
  return {
    id: 'number',
  };
};

const convertFormatReverse = (format: ValueFormatConfig) => {
  return {
    type: 'number' as const,
  };
};

export type MaxMinAvgSumColumnParams = AvgIndexPatternColumn['params'];
export const getMaxMinAvgSumColumn = (
  operation: string,
  options: LensApiMetricOperation
):
  | AvgIndexPatternColumn
  | MaxIndexPatternColumn
  | MinIndexPatternColumn
  | SumIndexPatternColumn => {
  const { format, field, label } = options ?? {};

  return {
    dataType: 'number',
    isBucketed: false,
    label: label || '',
    customLabel: !!label,
    operationType: operation as 'min' | 'max' | 'sum' | 'average',
    sourceField: field || '',
    // filter: options.filter,
    // timeScale: options.time_scale,
    reducedTimeRange: options.reduced_time_range,
    timeShift: options.time_shift,
    params: {
      format: convertFormat(format),
    },
  };
};

export const getMaxMinAvgSumColumnReverse = (
  options:
    | AvgIndexPatternColumn
    | MaxIndexPatternColumn
    | MinIndexPatternColumn
    | SumIndexPatternColumn
): LensApiMetricOperation => {
  return {
    operation: options.operationType as 'min' | 'max' | 'sum' | 'median',
    ...(options.params?.format ? { format: convertFormatReverse(options.params.format) } : {}),
    field: options.sourceField,
    ...(options.customLabel ? { label: options.label } : {}),
    // filter: options.filter,
    time_scale: options.timeScale,
    reduced_time_range: options.reducedTimeRange,
    time_shift: options.timeShift,
  };
};
