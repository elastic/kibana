/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PARTITION_CHART_TYPES_WITH_DEFAULT_EMPTY_ROWS_OFF } from './constants';

const partitionChartTypesWithDefaultEmptyRowsOffSet = new Set<string>(
  PARTITION_CHART_TYPES_WITH_DEFAULT_EMPTY_ROWS_OFF
);

export const isPartitionChartTypeWithDefaultEmptyRowsOff = (
  chartType: string | null | undefined
): chartType is (typeof PARTITION_CHART_TYPES_WITH_DEFAULT_EMPTY_ROWS_OFF)[number] =>
  typeof chartType === 'string' && partitionChartTypesWithDefaultEmptyRowsOffSet.has(chartType);
