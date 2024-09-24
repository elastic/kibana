/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { AVG_ID, AVG_NAME } from './src/operations/average';
export { COUNT_ID, COUNT_NAME } from './src/operations/count';
export { CARDINALITY_ID, CARDINALITY_NAME } from './src/operations/cardinality';
export { COUNTER_RATE_ID, COUNTER_RATE_NAME } from './src/operations/counter_rate';
export { CUMULATIVE_SUM_ID, CUMULATIVE_SUM_NAME } from './src/operations/cumulative_sum';
export { DIFFERENCES_ID, DIFFERENCES_NAME } from './src/operations/differences';
export { INTERVAL_ID, INTERVAL_NAME } from './src/operations/interval';
export { LAST_VALUE_ID, LAST_VALUE_NAME } from './src/operations/last_value';
export { MAX_ID, MAX_NAME } from './src/operations/max';
export { MEDIAN_ID, MEDIAN_NAME } from './src/operations/median';
export { MIN_ID, MIN_NAME } from './src/operations/min';
export {
  MOVING_AVERAGE_ID,
  MOVING_AVERAGE_NAME,
  MOVING_AVERAGE_WINDOW_DEFAULT_VALUE,
} from './src/operations/moving_average';
export { NORMALIZE_BY_UNIT_ID, NORMALIZE_BY_UNIT_NAME } from './src/operations/normalize_by_unit';
export { NOW_ID, NOW_NAME } from './src/operations/now';
export { OVERALL_AVERAGE_ID, OVERALL_AVERAGE_NAME } from './src/operations/overall_average';
export { OVERALL_MAX_ID, OVERALL_MAX_NAME } from './src/operations/overall_max';
export { OVERALL_MIN_ID, OVERALL_MIN_NAME } from './src/operations/overall_min';
export { OVERALL_SUM_ID, OVERALL_SUM_NAME } from './src/operations/overall_sum';
export { PERCENTILE_RANK_ID, PERCENTILE_RANK_NAME } from './src/operations/percentile_ranks';
export { PERCENTILE_ID, PERCENTILE_NAME } from './src/operations/percentile';
export { STD_DEVIATION_ID, STD_DEVIATION_NAME } from './src/operations/std_deviation';
export { SUM_ID, SUM_NAME } from './src/operations/sum';
export { TIME_RANGE_ID, TIME_RANGE_NAME } from './src/operations/time_range';

import { average } from './src/operations/average';
import { count } from './src/operations/count';
import { cardinality } from './src/operations/cardinality';
import { counterRate } from './src/operations/counter_rate';
import { cumulativeSum } from './src/operations/cumulative_sum';
import { differences } from './src/operations/differences';
import { interval } from './src/operations/interval';
import { lastValue } from './src/operations/last_value';
import { max } from './src/operations/max';
import { median } from './src/operations/median';
import { min } from './src/operations/min';
import { movingAverage } from './src/operations/moving_average';
import { normalizeByUnit } from './src/operations/normalize_by_unit';
import { now } from './src/operations/now';
import { overallAverge } from './src/operations/overall_average';
import { overallMax } from './src/operations/overall_max';
import { overallMin } from './src/operations/overall_min';
import { overallSum } from './src/operations/overall_sum';
import { percentileRank } from './src/operations/percentile_ranks';
import { percentile } from './src/operations/percentile';
import { stdDeviation } from './src/operations/std_deviation';
import { sum } from './src/operations/sum';
import { timeRange } from './src/operations/time_range';
import { OperationDocumentationType } from './src/operations/types';

export const documentationMap: Record<string, OperationDocumentationType> = [
  average,
  count,
  cardinality,
  counterRate,
  cumulativeSum,
  differences,
  interval,
  lastValue,
  max,
  median,
  min,
  movingAverage,
  normalizeByUnit,
  now,
  overallAverge,
  overallMax,
  overallMin,
  overallSum,
  percentileRank,
  percentile,
  stdDeviation,
  sum,
  timeRange,
].reduce((memo: Record<string, OperationDocumentationType>, op: OperationDocumentationType) => {
  memo[op.id] = op;
  return memo;
}, {});

export { tinymathFunctions, getTypeI18n } from './src/math';
export { sections } from './src/sections';
