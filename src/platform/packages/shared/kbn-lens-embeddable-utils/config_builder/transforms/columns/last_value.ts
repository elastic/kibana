/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LastValueIndexPatternColumn } from '@kbn/lens-plugin/public';
import type { LensApiLastValueOperation } from '../../schema/metric_ops';
import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';
import { getLensAPIMetricSharedProps, getLensStateMetricSharedProps } from './utils';
import { LENS_LAST_VALUE_DEFAULT_SHOW_ARRAY_VALUES } from '../../schema/constants';

function ofName(field: string): string {
  if (field === '') {
    return `Last value of (empty)`;
  }
  return `Last value of ${field}`;
}

export const fromLastValueAPItoLensState = (
  options: LensApiLastValueOperation
): LastValueIndexPatternColumn => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { field, format, sort_by, show_array_values } = options ?? {};

  return {
    operationType: 'last_value',
    sourceField: field,
    ...getLensStateMetricSharedProps(options, ofName(field)),
    params: {
      sortField: sort_by,
      showArrayValues: show_array_values ?? LENS_LAST_VALUE_DEFAULT_SHOW_ARRAY_VALUES,
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
    show_array_values: options.params.showArrayValues ?? LENS_LAST_VALUE_DEFAULT_SHOW_ARRAY_VALUES,
    ...getLensAPIMetricSharedProps(options, ofName(options.sourceField)),
    ...(options.params?.format ? { format: fromFormatLensStateToAPI(options.params.format) } : {}),
  };
};
