/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { TimeRangeBounds } from '../..';
export interface CalculateBoundsOptions {
  forceNow?: Date;
}
export declare function calculateBounds(
  timeRange: TimeRange,
  options?: CalculateBoundsOptions
): TimeRangeBounds;
export declare function getAbsoluteTimeRange(
  timeRange: TimeRange,
  {
    forceNow,
  }?: {
    forceNow?: Date;
  }
): TimeRange;
export declare function getTime(
  indexPattern: DataView | undefined,
  timeRange: TimeRange,
  options?: {
    forceNow?: Date;
    fieldName?: string;
  }
):
  | import('@kbn/es-query/src/filters/build_filters').MatchAllRangeFilter
  | import('@kbn/es-query').RangeFilter
  | import('@kbn/es-query').ScriptedRangeFilter
  | undefined;
export declare function getRelativeTime(
  indexPattern: DataView | undefined,
  timeRange: TimeRange,
  options?: {
    forceNow?: Date;
    fieldName?: string;
  }
):
  | import('@kbn/es-query/src/filters/build_filters').MatchAllRangeFilter
  | import('@kbn/es-query').RangeFilter
  | import('@kbn/es-query').ScriptedRangeFilter
  | undefined;
