/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AVG_ID,
  CARDINALITY_ID,
  COUNT_ID,
  MAX_ID,
  MEDIAN_ID,
  MIN_ID,
  PERCENTILE_ID,
  STD_DEVIATION_ID,
  SUM_ID,
} from '@kbn/lens-formula-docs';
import type { OperationType } from '../../datasources/types';
import { countToESQL } from './count_to_esql';
import { cardinalityToESQL } from './cardinality_to_esql';
import { percentileToESQL } from './percentile_to_esql';
import { buildMetricToESQL } from './metric_to_esql';
import { dateHistogramToESQL } from './date_histogram_to_esql';
import { rangesToESQL } from './ranges_to_esql';
import type { ToEsqlFn } from './types';

export const DATE_HISTOGRAM_ID = 'date_histogram';
export const RANGE_ID = 'range';

/**
 * UI-free registry of per-operation DSL-to-ES|QL conversion functions,
 * keyed by operation type.
 */
export const toEsqlRegistry: Partial<Record<OperationType, ToEsqlFn>> = {
  [COUNT_ID]: countToESQL,
  [CARDINALITY_ID]: cardinalityToESQL,
  [PERCENTILE_ID]: percentileToESQL,
  [MIN_ID]: buildMetricToESQL(MIN_ID),
  [MAX_ID]: buildMetricToESQL(MAX_ID),
  [AVG_ID]: buildMetricToESQL(AVG_ID),
  [SUM_ID]: buildMetricToESQL(SUM_ID),
  [MEDIAN_ID]: buildMetricToESQL(MEDIAN_ID),
  [STD_DEVIATION_ID]: buildMetricToESQL(STD_DEVIATION_ID),
  [DATE_HISTOGRAM_ID]: dateHistogramToESQL,
  [RANGE_ID]: rangesToESQL,
};
