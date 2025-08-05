/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PercentileIndexPatternColumn } from '@kbn/lens-plugin/public';
import type { LensApiPercentileOperation } from '../schema/metric_ops';

export const getPercentileColumn = (
  options: LensApiPercentileOperation
): PercentileIndexPatternColumn => {
  return {
    dataType: 'number',
    isBucketed: false,
    ...(options.label ? { label: options.label, customLabel: true } : { label: 'Percentile' }),
    operationType: 'percentile',
    sourceField: options.field,
    params: {
      percentile: options.percentile,
    },
  };
};

export const getPercentileColumnReverse = (
  options: PercentileIndexPatternColumn
): LensApiPercentileOperation => {
  // TODO: Implement the actual logic
  return {
    operation: 'percentile',
    ...(options.customLabel ? { label: options.label } : {}),
    field: options.sourceField,
    percentile: options.params.percentile,
  };
};
