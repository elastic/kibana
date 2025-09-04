/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DerivativeIndexPatternColumn } from '@kbn/lens-plugin/public';
import type {
  LensApiDifferencesOperation,
  LensApiFieldMetricOperations,
} from '../../schema/metric_ops';
import { getLensAPIMetricSharedProps, getLensStateMetricSharedProps } from './utils';
import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';

export function fromDifferencesAPItoLensState(
  options: LensApiDifferencesOperation,
  ref: { id: string; field: string; label: string }
): DerivativeIndexPatternColumn {
  return {
    operationType: 'differences',
    references: [ref.id],
    ...getLensStateMetricSharedProps(options),
    params: {
      ...(options.format ? { format: fromFormatAPIToLensState(options.format) } : {}),
    },
  };
}

export function fromDifferencesLensStateToAPI(
  column: DerivativeIndexPatternColumn,
  ref: LensApiFieldMetricOperations
): LensApiDifferencesOperation {
  return {
    operation: 'differences',
    ...getLensAPIMetricSharedProps(column),
    of: ref,
    ...(column.params?.format ? { format: fromFormatLensStateToAPI(column.params.format) } : {}),
  };
}
