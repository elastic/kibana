/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MovingAverageIndexPatternColumn } from '@kbn/lens-plugin/public';
import type {
  LensApiMovingAverageOperation,
  LensApiFieldMetricOperations,
} from '../../schema/metric_ops';
import { getLensAPIMetricSharedProps, getLensStateMetricSharedProps } from './utils';
import { LENS_MOVING_AVERAGE_DEFAULT_WINDOW } from '../../schema/constants';
import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';

function ofName(name?: string): string {
  if (name == null || name === '') {
    return `Moving average of (incomplete)`;
  }
  return `Moving average of ${name}`;
}

export function fromMovingAverageAPItoLensState(
  options: LensApiMovingAverageOperation,
  ref: { id: string; field?: string; label?: string }
): MovingAverageIndexPatternColumn {
  const label = ofName(ref.label);
  return {
    operationType: 'moving_average',
    references: [ref.id],
    ...getLensStateMetricSharedProps(options, label),
    params: {
      window: options.window ?? LENS_MOVING_AVERAGE_DEFAULT_WINDOW,
      ...(options.format ? { format: fromFormatAPIToLensState(options.format) } : {}),
    },
  };
}

export function fromMovingAverageLensStateToAPI(
  column: MovingAverageIndexPatternColumn,
  ref: LensApiFieldMetricOperations,
  refDefaultLabel: string
): LensApiMovingAverageOperation {
  return {
    operation: 'moving_average',
    ...getLensAPIMetricSharedProps(column, ofName(refDefaultLabel)),
    of: ref,
    window: column.params.window ?? LENS_MOVING_AVERAGE_DEFAULT_WINDOW,
    ...(column.params?.format ? { format: fromFormatLensStateToAPI(column.params.format) } : {}),
  };
}
