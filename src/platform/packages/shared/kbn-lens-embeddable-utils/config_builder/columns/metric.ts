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
import { getLastValueColumn, getLastValueColumnReverse } from './last_value';
import { getStaticValueColumn, getStaticValueColumnReverse } from './static_value';
import { getCounterRateColumn, getCounterRateColumnReverse } from './counter_rate';
import { getCumulativeSumColumn, getCumulativeSumColumnReverse } from './cumulative_sum';
import { getPercentileColumn, getPercentileColumnReverse } from './percentile';
import { getPercentileRanksColumn, getPercentileRanksColumnReverse } from './percentile_ranks';
import { getUniqueValuesColumn, getUniqueValuesColumnReverse } from './unique_values';

export const getMetricColumn = (options: LensApiMetricOperations | LensApiFormulaOperation): GenericIndexPatternColumn[] | GenericIndexPatternColumn => {
  const metricType = options.operation;

  switch (metricType) {
    case 'count':
      return getCountColumn(options);
    case 'min': case 'max': case 'median': case 'sum':
      return getMaxMinAvgSumColumn(metricType, options);
    case 'last_value':
      return getLastValueColumn(options);
    case 'static_value':
      return getStaticValueColumn(options);
    case 'counter_rate':
      return getCounterRateColumn(options);
    case 'cumulative_sum':
      return getCumulativeSumColumn(options);
    case 'percentile':
      return getPercentileColumn(options);
    case 'percentile_ranks':
      return getPercentileRanksColumn(options);
    case 'unique_values':
      return getUniqueValuesColumn(options);
    case 'formula':
      return getFormulaColumn(options);
    default:
      throw new Error(`Unsupported metric operation type: ${metricType}`);
  }
};

export const getMetricColumnReverse = (options: GenericIndexPatternColumn, columns: Record<string, GenericIndexPatternColumn>): LensApiMetricOperations | LensApiFormulaOperation => {
  switch (options.operationType) {
    case 'count':
      return getCountColumnReverse(options as any);
    case 'min': case 'max': case 'median': case 'sum':
      return getMaxMinAvgSumColumnReverse(options as any);
    case 'last_value':
      return getLastValueColumnReverse(options as any);
    case 'static_value':
      return getStaticValueColumnReverse(options as any);
    case 'counter_rate':
      return getCounterRateColumnReverse(options as any, columns);
    case 'cumulative_sum':
      return getCumulativeSumColumnReverse(options as any, columns);
    case 'percentile':
      return getPercentileColumnReverse(options as any);
    case 'percentile_ranks':
      return getPercentileRanksColumnReverse(options as any);
    case 'unique_values':
      return getUniqueValuesColumnReverse(options as any);
    case 'formula':
      return fromFormulaColumn(options as any);
    default:
      throw new Error(`Unsupported metric operation type: ${options.operationType}`);
  }
};
