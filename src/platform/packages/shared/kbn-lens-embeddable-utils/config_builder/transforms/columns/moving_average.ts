/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MovingAverageIndexPatternColumn } from '@kbn/lens-common';
import type {
  LensApiMovingAverageOperation,
  LensApiFieldMetricOperations,
} from '../../schema/metric_ops';
import { getLensAPIMetricSharedProps, getLensStateMetricSharedProps } from './utils';
import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';

export function fromMovingAverageAPItoLensState(
  options: LensApiMovingAverageOperation
): MovingAverageIndexPatternColumn {
  return {
    operationType: 'moving_average',
    references: [], // populated later when we have the ID of the referenced column
    ...getLensStateMetricSharedProps(options),
    params: {
      window: options.window,
      ...(options.format ? { format: fromFormatAPIToLensState(options.format) } : {}),
    },
  };
}

export function fromMovingAverageLensStateToAPI(
  column: MovingAverageIndexPatternColumn,
  ref: LensApiFieldMetricOperations
): LensApiMovingAverageOperation {
  return {
    operation: 'moving_average',
    ...getLensAPIMetricSharedProps(column),
    of: ref,
    window: column.params.window,
    ...(column.params?.format ? { format: fromFormatLensStateToAPI(column.params.format) } : {}),
  };
}
