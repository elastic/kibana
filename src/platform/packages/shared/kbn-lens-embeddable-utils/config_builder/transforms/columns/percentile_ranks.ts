/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PercentileRanksIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiPercentileRanksOperation } from '../../schema/metric_ops';
import { getLensAPIMetricSharedProps, getLensStateMetricSharedProps } from './utils';
import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';

export const fromPercentileRanksAPItoLensState = (
  options: LensApiPercentileRanksOperation
): PercentileRanksIndexPatternColumn => {
  const { field, rank } = options;

  return {
    operationType: 'percentile_rank',
    sourceField: field,
    ...getLensStateMetricSharedProps(options),
    params: {
      value: rank,
      format: fromFormatAPIToLensState(options.format),
    },
  };
};

export const fromPercentileRankLensStateToAPI = (
  options: PercentileRanksIndexPatternColumn
): LensApiPercentileRanksOperation => {
  return {
    operation: options.operationType,
    field: options.sourceField,
    rank: options.params?.value,
    ...getLensAPIMetricSharedProps(options),
    ...(options.params?.format ? { format: fromFormatLensStateToAPI(options.params.format) } : {}),
  };
};
