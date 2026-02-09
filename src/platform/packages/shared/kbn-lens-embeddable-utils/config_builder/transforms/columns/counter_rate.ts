/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CounterRateIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiCounterRateOperation, LensApiMetricOperation } from '../../schema/metric_ops';
import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';
import { getLensAPIMetricSharedProps, getLensStateMetricSharedProps } from './utils';

export const fromCounterRateAPItoLensState = (
  options: LensApiCounterRateOperation
): CounterRateIndexPatternColumn => {
  const { format } = options;
  const { reducedTimeRange, ...sharedProps } = getLensStateMetricSharedProps(options);
  return {
    operationType: 'counter_rate',
    references: [], // populated later when we have the ID of the referenced column
    ...sharedProps,
    params: {
      ...(format ? { format: fromFormatAPIToLensState(format) } : {}),
    },
  };
};

export const fromCounterRateLensStateToAPI = (
  options: CounterRateIndexPatternColumn,
  ref: LensApiMetricOperation
): LensApiCounterRateOperation => {
  const { reduced_time_range, ...sharedProps } = getLensAPIMetricSharedProps(options);
  return {
    operation: 'counter_rate',
    field: ref.field,
    ...sharedProps,
    ...(options.params?.format ? { format: fromFormatLensStateToAPI(options.params.format) } : {}),
  };
};
