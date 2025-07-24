/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GenericIndexPatternColumn } from '@kbn/lens-plugin/public';

import { getCountColumn, getCountColumnReverse } from './count';
import { LensApiFormulaOperation, LensApiMetricOperations } from '../schema/metric_ops';
import { getMaxMinAvgSumColumn, getMaxMinAvgSumColumnReverse } from './max_min_avg_sum';
import { getFormulaColumn, fromFormulaColumn } from './formula';

export const getMetricColumn = (options: LensApiMetricOperations | LensApiFormulaOperation): GenericIndexPatternColumn => {
  const metricType = options.operation;

  switch (metricType) {
    case 'count':
      return getCountColumn(options);
    case 'min': case 'max': case 'median': case 'sum':
      return getMaxMinAvgSumColumn(metricType, options);
    case 'formula':
      return getFormulaColumn(options);
    default:
      throw new Error(`Unsupported metric operation type: ${metricType}`);
  }
};

export const getMetricColumnReverse = (options: GenericIndexPatternColumn): LensApiMetricOperations | LensApiFormulaOperation => {
  switch (options.operationType) {
    case 'count':
      return getCountColumnReverse(options as any);
    case 'min': case 'max': case 'median': case 'sum':
      return getMaxMinAvgSumColumnReverse(options as any);
    case 'formula':
      return fromFormulaColumn(options as any);
    default:
      throw new Error(`Unsupported metric operation type: ${options.operationType}`);
  }
};
