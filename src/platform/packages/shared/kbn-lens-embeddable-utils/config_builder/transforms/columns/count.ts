/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CountIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiCountMetricOperation } from '../../schema/metric_ops';
import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';
import { getLensAPIMetricSharedProps, getLensStateMetricSharedProps } from './utils';

export type CountColumnParams = CountIndexPatternColumn['params'];

export const fromCountAPItoLensState = (
  options: LensApiCountMetricOperation
): CountIndexPatternColumn => {
  const { empty_as_null, format, field } = options;

  return {
    operationType: 'count',
    sourceField: field || '___records___',
    ...getLensStateMetricSharedProps(options),
    params: {
      emptyAsNull: empty_as_null,
      ...(format ? { format: fromFormatAPIToLensState(format) } : {}),
    },
  };
};

export const fromCountLensStateToAPI = (
  options: CountIndexPatternColumn
): LensApiCountMetricOperation => {
  return {
    operation: 'count',
    ...(options.sourceField !== '___records___' ? { field: options.sourceField } : {}),
    empty_as_null: Boolean(options.params?.emptyAsNull),
    ...getLensAPIMetricSharedProps(options),
    ...(options.params?.format ? { format: fromFormatLensStateToAPI(options.params.format) } : {}),
  };
};
