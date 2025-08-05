/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DateHistogramIndexPatternColumn } from '@kbn/lens-plugin/public';
import { LensApiDateHistogramOperation } from '../schema/bucket_ops';

export type DateHistogramColumnParams = DateHistogramIndexPatternColumn['params'];
export const getHistogramColumn = (
  options: LensApiDateHistogramOperation
): DateHistogramIndexPatternColumn => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { suggested_interval = 'auto', field, ...rest } = options;

  return {
    dataType: 'date',
    isBucketed: true,
    label: '@timestamp',
    operationType: 'date_histogram',
    scale: 'interval',
    sourceField: field,
    params: { interval: suggested_interval, ...rest },
  };
};

export const fromHistogramColumn = (
  column: DateHistogramIndexPatternColumn
): LensApiDateHistogramOperation => {
  const { params, sourceField } = column;
  return {
    operation: 'date_histogram',
    field: sourceField,
    suggested_interval: params?.interval,
  };
};
