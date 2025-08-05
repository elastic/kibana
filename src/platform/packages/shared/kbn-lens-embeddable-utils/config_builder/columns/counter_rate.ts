/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CounterRateIndexPatternColumn,
  GenericIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import type {
  LensApiCounterRateOperation,
  LensApiFieldMetricOperations,
} from '../schema/metric_ops';
import { getMetricColumnReverse, getMetricColumn } from './metric';

export const getCounterRateColumn = (
  options: LensApiCounterRateOperation
): [CounterRateIndexPatternColumn, GenericIndexPatternColumn] => {
  return [
    {
      dataType: 'number',
      isBucketed: false,
      label: options.label || 'Counter Rate',
      customLabel: !!options.label,
      operationType: 'counter_rate',
      references: [],
    },
    getMetricColumn(options.of) as GenericIndexPatternColumn,
  ];
};

export const getCounterRateColumnReverse = (
  options: CounterRateIndexPatternColumn,
  columns: Record<string, GenericIndexPatternColumn>
): LensApiCounterRateOperation => {
  const referenceColumn = columns[options.references[0]];

  return {
    operation: 'counter_rate',
    label: options.label,
    of: getMetricColumnReverse(referenceColumn, columns) as LensApiFieldMetricOperations,
  };
};
