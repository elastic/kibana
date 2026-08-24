/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql } from '@elastic/esql';
import type { MetricColumn } from '../../datasources/operations';
import type { ToEsqlFn } from './types';

const typeToESQLFn: Record<string, string> = {
  min: 'MIN',
  max: 'MAX',
  average: 'AVG',
  sum: 'SUM',
  median: 'MEDIAN',
  standard_deviation: 'MEDIAN_ABSOLUTE_DEVIATION',
};

/**
 * Builds the DSL-to-ES|QL conversion for a basic field metric operation
 * (min, max, average, sum, median, standard_deviation).
 */
export const buildMetricToESQL =
  (type: string): ToEsqlFn<MetricColumn<string>> =>
  (column) => {
    if (column.timeShift) return;
    if (!typeToESQLFn[type]) return;
    return {
      template: `${typeToESQLFn[type]}(${esql.col(column.sourceField)})`,
    };
  };
