/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import type { TimeRange } from '@kbn/es-query';
import { getTimeRangeResolution } from '@kbn/datemath';
import { calculateBounds } from '../../../../common';
import type { TimeRangeBounds } from '../types';

/**
 * Resolves time range bounds rounded to the `@kbn/datemath` time range resolution,
 * matching the DateRangePicker. Absolute bounds keep their precision.
 */
export const calculateRoundedBounds = (timeRange: TimeRange, now: Date): TimeRangeBounds => {
  const { from, to } = timeRange;
  const resolution = getTimeRangeResolution(from, to);
  const forceNow = resolution ? moment(now).startOf(resolution).toDate() : now;
  const { min, max } = calculateBounds(timeRange, { forceNow });

  if (!max || !resolution || !to.startsWith('now')) {
    return { min, max };
  }
  // Rounding up (`/d`, `/h`, ...) lands on `.999`; end on the last whole unit instead.
  return { min, max: max.clone().startOf(resolution) };
};

/** Converts a time range to absolute ISO strings using {@link calculateRoundedBounds}. */
export const getRoundedAbsoluteTimeRange = (timeRange: TimeRange, now: Date): TimeRange => {
  const { min, max } = calculateRoundedBounds(timeRange, now);
  return {
    from: min ? min.toISOString() : timeRange.from,
    to: max ? max.toISOString() : timeRange.to,
  };
};
