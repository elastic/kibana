/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PercentileRanksIndexPatternColumn } from '@kbn/lens-plugin/public';
import type { LensApiPercentileRanksOperation } from '../../schema/metric_ops';
import { LENS_PERCENTILE_RANK_DEFAULT_VALUE } from '../../schema/constants';
import { getLensAPIMetricSharedProps, getLensStateMetricSharedProps } from './utils';
import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';

function ofName(field: string, rank?: number): string {
  return `Percentile rank (${rank ?? LENS_PERCENTILE_RANK_DEFAULT_VALUE}) of ${field}`;
}

export const fromPercentileRanksAPItoLensState = (
  options: LensApiPercentileRanksOperation
): PercentileRanksIndexPatternColumn => {
  const { field, rank } = options;

  return {
    operationType: 'percentile_rank',
    sourceField: field,
    ...getLensStateMetricSharedProps(options, ofName(field, rank)),
    params: {
      value: rank ?? LENS_PERCENTILE_RANK_DEFAULT_VALUE,
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
    // @TODO: strip this out once fixed the schema output types
    rank: options.params?.value ?? LENS_PERCENTILE_RANK_DEFAULT_VALUE,
    ...getLensAPIMetricSharedProps(options, ofName(options.sourceField, options.params?.value)),
    ...(options.params?.format ? { format: fromFormatLensStateToAPI(options.params.format) } : {}),
  };
};
