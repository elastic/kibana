/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ColumnState } from '@kbn/lens-common';
import { isAPIColumnOfBucketType } from '../../columns/utils';
import type { LensApiAllOperations } from '../../../schema';
import { ACCESSOR } from './constants';

/**
 * In metric columns the isMetric is not set in all cases and neither is for rows
 * - For formBasedLayers: pass apiOperation to distinguish bucket (row) vs metric operations
 */
export function isMetricColumn(
  col: ColumnState,
  isFormBased: boolean,
  apiOperation?: LensApiAllOperations
) {
  if (isFormBased && apiOperation && isAPIColumnOfBucketType(apiOperation)) {
    return false;
  }
  return ('isMetric' in col && col.isMetric) || (!('isMetric' in col) && !col.isTransposed);
}

export function getAccessorName(
  type: 'metric' | 'row' | 'split_metric_by' | 'metric_ref',
  index?: number
) {
  if (index == null) {
    return `${ACCESSOR}_${type}`;
  }
  return `${ACCESSOR}_${type}_${index}`;
}
