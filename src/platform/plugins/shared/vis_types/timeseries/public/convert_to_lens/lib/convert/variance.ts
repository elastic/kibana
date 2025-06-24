/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFormulaEquivalent } from '../metrics';
import { createFormulaColumn } from './formula';
import { CommonColumnsConverterArgs } from './types';

export const convertVarianceToFormulaColumn = (
  { series, metrics, dataView }: CommonColumnsConverterArgs,
  reducedTimeRange?: string
) => {
  const metric = metrics[metrics.length - 1];

  const field = metric.field ? dataView.getFieldByName(metric.field) : undefined;
  if (!field) {
    return null;
  }

  const script = getFormulaEquivalent(metric, metrics, {
    reducedTimeRange,
    timeShift: series.offset_time,
  });
  if (!script) return null;
  return createFormulaColumn(script, { series, metric, dataView });
};
