/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CountIndexPatternColumn } from '@kbn/lens-plugin/public';
import { LensApiCountMetricOperation } from '../schema/metric_ops';
import { ValueFormatConfig } from '@kbn/lens-plugin/public/datasources/form_based/operations/definitions/column_types';

const convertFormat = (format: LensApiCountMetricOperation['format']) => {
  return {
    id: 'number'
  };
}

const convertFormatReverse = (format: ValueFormatConfig) => {
  return {
    type: 'number' as const
  };
}

export type CountColumnParams = CountIndexPatternColumn['params'];
export const getCountColumn = (options: LensApiCountMetricOperation): CountIndexPatternColumn => {
  const { empty_as_null, format, field, label } = options ?? {};

  return {
    dataType: 'number',
    isBucketed: false,
    label: label || '',
    customLabel: !!label,
    operationType: 'count',
    sourceField: field || '',
    // filter: options.filter,
    // timeScale: options.time_scale,
    reducedTimeRange: options.reduced_time_range,
    timeShift: options.time_shift,
    params: { 
        emptyAsNull: empty_as_null,
        format: convertFormat(format),
     },
  };
};

export const getCountColumnReverse = (options: CountIndexPatternColumn): LensApiCountMetricOperation => {
  return {
    operation: 'count',
    empty_as_null: options.params?.emptyAsNull,
    ...(options.params?.format ? { format: convertFormatReverse(options.params.format) } : {}),
    field: options.sourceField,
    ...( options.customLabel ? { label: options.label } : {} ),
    // filter: options.filter,
    time_scale: options.timeScale,
    reduced_time_range: options.reducedTimeRange,
    time_shift: options.timeShift,
  };
};
