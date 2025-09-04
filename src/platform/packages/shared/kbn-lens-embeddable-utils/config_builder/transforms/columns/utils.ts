/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataType, TimeScaleUnit } from '@kbn/visualizations-plugin/common';
import type { Query } from '@kbn/es-query';
import { fromFilterAPIToLensState, fromFilterLensStateToAPI } from './filter';
import type {
  LensApiAllMetricOperations,
  LensApiReferableMetricOperations,
} from '../../schema/metric_ops';
import type {
  AnyLensStateColumn,
  AnyMetricLensStateColumn,
  ReferableMetricLensStateColumn,
} from './types';
import type { LensApiAllOperations } from '../../schema';

export const LENS_EMPTY_AS_NULL_DEFAULT_VALUE = false;

const LENS_DEFAULT_LABEL = '';
export function getLensStateMetricSharedProps(
  options: {
    time_scale?: TimeScaleUnit;
    reduced_time_range?: string;
    time_shift?: string;
    filter?: { query: string; language: 'kuery' | 'lucene' };
    label?: string;
  },
  dataType: DataType = 'number'
) {
  return {
    dataType,
    isBucketed: false,
    filter: fromFilterAPIToLensState(options.filter),
    ...(options.time_scale ? { timeScale: options.time_scale } : {}),
    ...(options.reduced_time_range ? { reducedTimeRange: options.reduced_time_range } : {}),
    ...(options.time_shift ? { timeShift: options.time_shift } : {}),
    label: options.label ?? LENS_DEFAULT_LABEL,
    // @TODO improve this based on default label logic
    customLabel: options.label != null,
  };
}

export function getLensAPIMetricSharedProps(options: {
  customLabel?: boolean;
  timeScale?: TimeScaleUnit;
  reducedTimeRange?: string;
  timeShift?: string;
  filter?: Query;
  label?: string;
}) {
  return {
    ...(options.customLabel ? { label: options.label } : {}),
    ...(options.timeScale ? { time_scale: options.timeScale } : {}),
    ...(options.reducedTimeRange ? { reduced_time_range: options.reducedTimeRange } : {}),
    ...(options.timeShift ? { time_shift: options.timeShift } : {}),
    ...(options.filter ? { filter: fromFilterLensStateToAPI(options.filter) } : {}),
  };
}

export function getLensStateBucketSharedProps(options: { label?: string; field: string }) {
  return {
    sourceField: options.field,
    customLabel: options.label != null,
    label: options.label ?? LENS_DEFAULT_LABEL,
    isBucketed: true,
  };
}

export function getLensAPIBucketSharedProps(options: {
  label?: string;
  customLabel?: boolean;
  sourceField: string;
}) {
  return {
    field: options.sourceField,
    ...(options.customLabel ? { label: options.label } : {}),
  };
}

/**
 * Type guard to test if a given API column is of the specified operation type
 */

export function isAPIColumnOfType<C extends LensApiAllOperations>(
  type: C['operation'],
  column: LensApiAllOperations
): column is C {
  return column.operation === type;
}

const referrableTypes = [
  'sum',
  'min',
  'max',
  'average',
  'median',
  'standard_deviation',
  'percentile',
  'count',
  'unique_count',
  'last_value',
  'percentile_rank',
] as const;

export function isApiColumnOfReferableType(
  column: LensApiAllMetricOperations
): column is LensApiReferableMetricOperations {
  return referrableTypes.some((type) =>
    isAPIColumnOfType<LensApiReferableMetricOperations>(type, column)
  );
}

export function isLensStateColumnOfType<C extends AnyLensStateColumn>(
  type: C['operationType'],
  column: AnyLensStateColumn
): column is C {
  return column.operationType === type;
}

export function isColumnOfReferableType(
  column: AnyMetricLensStateColumn
): column is ReferableMetricLensStateColumn {
  return referrableTypes.some((type) =>
    isLensStateColumnOfType<ReferableMetricLensStateColumn>(type, column)
  );
}
