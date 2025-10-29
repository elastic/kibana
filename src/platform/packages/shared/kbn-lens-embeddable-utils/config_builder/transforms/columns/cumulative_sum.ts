/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CumulativeSumIndexPatternColumn } from '@kbn/lens-plugin/public';
import type {
  LensApiCumulativeSumOperation,
  LensApiSumMetricOperation,
} from '../../schema/metric_ops';
import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';
import { getLensAPIMetricSharedProps, getLensStateMetricSharedProps } from './utils';

export const fromCumulativeSumAPItoLensState = (
  options: LensApiCumulativeSumOperation,
  ref: { id: string; field: string }
): CumulativeSumIndexPatternColumn => {
  const { format } = options;

  return {
    operationType: 'cumulative_sum',
    references: [ref.id],
    ...getLensStateMetricSharedProps(options),
    params: {
      ...(format ? { format: fromFormatAPIToLensState(format) } : {}),
    },
  };
};

export const fromCumulativeSumLensStateToAPI = (
  options: CumulativeSumIndexPatternColumn,
  ref: LensApiSumMetricOperation
): LensApiCumulativeSumOperation => {
  return {
    operation: 'cumulative_sum',
    field: ref.field,
    ...getLensAPIMetricSharedProps(options),
    ...(options.params?.format ? { format: fromFormatLensStateToAPI(options.params.format) } : {}),
  };
};
