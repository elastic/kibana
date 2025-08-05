/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PercentileRanksIndexPatternColumn } from '@kbn/lens-plugin/public';
import type { LensApiPercentileRanksOperation } from '../schema/metric_ops';

export const getPercentileRanksColumn = (
  options: LensApiPercentileRanksOperation
): PercentileRanksIndexPatternColumn => {
  return {
    dataType: 'number',
    isBucketed: false,
    ...(options.label
      ? { label: options.label, customLabel: true }
      : { label: 'Percentile Ranks' }),
    operationType: 'percentile_rank',
    sourceField: options.field,
    params: {
      value: options.ranks[0],
    },
  };
};

export const getPercentileRanksColumnReverse = (
  options: PercentileRanksIndexPatternColumn
): LensApiPercentileRanksOperation => {
  return {
    operation: 'percentile_ranks',
    label: options.label,
    field: options.sourceField,
    ranks: [options.params.value],
  };
};
