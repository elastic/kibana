/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LastValueIndexPatternColumn } from '@kbn/lens-plugin/public';
import { ValueFormatConfig } from '@kbn/lens-plugin/common';
import { LensApiLastValueOperation } from '../schema/metric_ops';

const convertFormat = (format: LensApiLastValueOperation['format']) => {
  return {
    id: 'number',
  };
};

const convertFormatReverse = (format: ValueFormatConfig) => {
  return {
    type: 'number' as const,
  };
};

export type LastValueColumnParams = LastValueIndexPatternColumn['params'];
export const getLastValueColumn = (
  options: LensApiLastValueOperation
): LastValueIndexPatternColumn => {
  const { format, field, label } = options ?? {};

  return {
    dataType: 'number',
    isBucketed: false,
    label: label || '',
    customLabel: !!label,
    operationType: 'last_value',
    sourceField: field || '',
    // filter: options.filter,
    // timeScale: options.time_scale,
    ...(options.reduced_time_range ? { reducedTimeRange: options.reduced_time_range } : {}),
    ...(options.time_shift ? { timeShift: options.time_shift } : {}),
    params: {
      sortField: field,
      showArrayValues: false,
      ...(format ? { format: convertFormat(format) } : {}),
    },
  };
};

export const getLastValueColumnReverse = (
  options: LastValueIndexPatternColumn
): LensApiLastValueOperation => {
  return {
    operation: 'last_value',
    field: options.sourceField,
    ...(options.params?.format ? { format: convertFormatReverse(options.params.format) } : {}),
    ...(options.customLabel ? { label: options.label } : {}),
    ...(options.timeScale ? { time_scale: options.timeScale } : {}),
    ...(options.reducedTimeRange ? { reduced_time_range: options.reducedTimeRange } : {}),
    ...(options.timeShift ? { time_shift: options.timeShift } : {}),
    // ...(options.filter ? { filter: options.filter } : {}),
  };
};
