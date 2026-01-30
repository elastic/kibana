/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LastValueIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiLastValueOperation } from '../../schema/metric_ops';
import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';
import { getLensAPIMetricSharedProps, getLensStateMetricSharedProps } from './utils';

export const fromLastValueAPItoLensState = (
  options: LensApiLastValueOperation
): LastValueIndexPatternColumn => {
  const { field, format, sort_by, show_array_values } = options;

  return {
    operationType: 'last_value',
    sourceField: field,
    ...getLensStateMetricSharedProps(options),
    params: {
      sortField: sort_by,
      showArrayValues: show_array_values,
      ...(format ? { format: fromFormatAPIToLensState(format) } : {}),
    },
  };
};

export const fromLastValueLensStateToAPI = (
  options: LastValueIndexPatternColumn
): LensApiLastValueOperation => {
  return {
    operation: 'last_value',
    field: options.sourceField,
    sort_by: options.params.sortField,
    show_array_values: options.params.showArrayValues,
    ...getLensAPIMetricSharedProps(options),
    ...(options.params?.format ? { format: fromFormatLensStateToAPI(options.params.format) } : {}),
  };
};
