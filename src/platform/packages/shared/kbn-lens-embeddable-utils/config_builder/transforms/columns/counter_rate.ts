/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CounterRateIndexPatternColumn } from '@kbn/lens-plugin/public';
import type { LensApiCounterRateOperation, LensApiMetricOperation } from '../../schema/metric_ops';
import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';
import { getLensAPIMetricSharedProps, getLensStateMetricSharedProps } from './utils';

export const fromCounterRateAPItoLensState = (
  options: LensApiCounterRateOperation,
  ref?: { id: string; field: string }
): CounterRateIndexPatternColumn => {
  const { format } = options;
  const { reducedTimeRange, ...sharedProps } = getLensStateMetricSharedProps(options);
  return {
    operationType: 'counter_rate',
    references: ref && ref.id ? [ref.id] : [],
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
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { reduced_time_range, ...sharedProps } = getLensAPIMetricSharedProps(options);
  return {
    operation: 'counter_rate',
    field: ref.field,
    ...sharedProps,
    ...(options.params?.format ? { format: fromFormatLensStateToAPI(options.params.format) } : {}),
  };
};
