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

export function getLensStateMetricSharedProps(
  options: {
    time_scale?: TimeScaleUnit;
    reduced_time_range?: string;
    time_shift?: string;
    filter?: { query: string; language: 'kuery' | 'lucene' };
    label?: string;
  },
  defaultLabel: string = '',
  dataType: DataType = 'number'
) {
  return {
    dataType,
    isBucketed: false,
    filter: fromFilterAPIToLensState(options.filter),
    timeScale: options.time_scale,
    reducedTimeRange: options.reduced_time_range,
    timeShift: options.time_shift,
    label: options.label ?? defaultLabel,
    // @TODO improve this based on default label logic
    customLabel: options.label != null,
  };
}

export function getLensAPIMetricSharedProps(
  options: {
    customLabel?: boolean;
    timeScale?: TimeScaleUnit;
    reducedTimeRange?: string;
    timeShift?: string;
    filter?: Query;
    label?: string;
  },
  defaultLabel: string = ''
) {
  return {
    ...(defaultLabel !== options.label ? { label: options.label } : {}),
    ...(options.timeScale ? { time_scale: options.timeScale } : {}),
    ...(options.reducedTimeRange ? { reduced_time_range: options.reducedTimeRange } : {}),
    ...(options.timeShift ? { time_shift: options.timeShift } : {}),
    ...(options.filter ? { filter: fromFilterLensStateToAPI(options.filter) } : {}),
  };
}

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
