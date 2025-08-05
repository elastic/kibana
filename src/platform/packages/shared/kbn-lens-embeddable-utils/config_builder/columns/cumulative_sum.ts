/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CumulativeSumIndexPatternColumn,
  GenericIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import type {
  LensApiCumulativeSumOperation,
  LensApiFieldMetricOperations,
} from '../schema/metric_ops';
import { getMetricColumn, getMetricColumnReverse } from './metric';

export const getCumulativeSumColumn = (
  options: LensApiCumulativeSumOperation
): [CumulativeSumIndexPatternColumn, GenericIndexPatternColumn] => {
  return [
    {
      dataType: 'number',
      isBucketed: false,
      ...(options.label
        ? { label: options.label, customLabel: true }
        : { label: 'Advanced Metric' }),
      operationType: options.operation,
      references: [],
      params: {
        // format:
      },
    },
    getMetricColumn(options.of) as GenericIndexPatternColumn,
  ];
};

export const getCumulativeSumColumnReverse = (
  options: CumulativeSumIndexPatternColumn,
  columns: Record<string, GenericIndexPatternColumn>
): LensApiCumulativeSumOperation => {
  const referenceColumn = columns[options.references[0]];
  return {
    operation: options.operationType as LensApiCumulativeSumOperation['operation'],
    ...(options.customLabel ? { label: options.label } : {}),
    of: getMetricColumnReverse(referenceColumn, columns) as LensApiFieldMetricOperations,
  };
};
