/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GenericIndexPatternColumn } from '@kbn/lens-plugin/public';
import type { LensApiUniqueValuesMetricOperation } from '../schema/metric_ops';

export const getUniqueValuesColumn = (options: LensApiUniqueValuesMetricOperation): GenericIndexPatternColumn => {
  // TODO: Implement the actual logic
  return {
    dataType: 'number',
    isBucketed: false,
    label: options.label || 'Unique Values',
    customLabel: !!options.label,
    operationType: 'unique_values',
    sourceField: options.field,
    params: options.params,
  };
};

export const getUniqueValuesColumnReverse = (options: GenericIndexPatternColumn): LensApiUniqueValuesMetricOperation => {
  // TODO: Implement the actual logic
  return {
    operation: 'unique_values',
    label: options.label,
    field: options.sourceField,
    params: options.params,
  };
};
