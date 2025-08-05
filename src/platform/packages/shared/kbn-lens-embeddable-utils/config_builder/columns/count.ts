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
import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';
import { fromFilterAPIToLensState, fromFilterLensStateToAPI } from './filter';

export type CountColumnParams = CountIndexPatternColumn['params'];
export const fromCountAPItoLensState = (
  options: LensApiCountMetricOperation
): CountIndexPatternColumn => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { empty_as_null, format, field, label, filter } = options ?? {};

  return {
    dataType: 'number',
    isBucketed: false,
    label: label || '',
    customLabel: !!label,
    operationType: 'count',
    sourceField: field || '',
    ...(filter ? fromFilterAPIToLensState(filter) : {}),
    timeScale: options.time_scale,
    ...(options.reduced_time_range ? { reducedTimeRange: options.reduced_time_range } : {}),
    ...(options.time_shift ? { timeShift: options.time_shift } : {}),
    params: {
      emptyAsNull: empty_as_null || false,
      ...(format ? { format: fromFormatAPIToLensState(format) } : {}),
    },
  };
};

export const fromCountLensStateToAPI = (
  options: CountIndexPatternColumn
): LensApiCountMetricOperation => {
  return {
    operation: 'count',
    field: options.sourceField,
    ...(options.params?.emptyAsNull ? { empty_as_null: options.params?.emptyAsNull } : {}),
    ...(options.params?.format ? { format: fromFormatLensStateToAPI(options.params.format) } : {}),
    ...(options.customLabel ? { label: options.label } : {}),
    ...(options.timeScale ? { time_scale: options.timeScale } : {}),
    ...(options.reducedTimeRange ? { reduced_time_range: options.reducedTimeRange } : {}),
    ...(options.timeShift ? { time_shift: options.timeShift } : {}),
    ...(options.filter ? { filter: fromFilterLensStateToAPI(options.filter) } : {}),
  };
};
