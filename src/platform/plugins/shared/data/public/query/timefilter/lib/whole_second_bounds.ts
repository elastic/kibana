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
import { calculateBounds } from '../../../../common';
import type { TimeRangeBounds } from '../types';

const isRelative = (value: string): boolean => value.startsWith('now');

const usesMilliseconds = (value: string): boolean => isRelative(value) && value.includes('ms');

/**
 * Resolves time range bounds on whole seconds, matching the DateRangePicker: "now" is
 * truncated to the last whole second and rounded-up relative ends (e.g. `now/d`) end on
 * the last whole second instead of `.999`. Bounds using the `ms` unit keep milliseconds.
 */
export const calculateWholeSecondBounds = (timeRange: TimeRange, now: Date): TimeRangeBounds => {
  const { from, to } = timeRange;
  const keepMilliseconds = usesMilliseconds(from) || usesMilliseconds(to);
  const forceNow = keepMilliseconds ? now : moment(now).startOf('second').toDate();
  const { min, max } = calculateBounds(timeRange, { forceNow });

  if (!max || keepMilliseconds || !isRelative(to)) {
    return { min, max };
  }
  return { min, max: max.clone().startOf('second') };
};

/** Converts a time range to absolute ISO strings using {@link calculateWholeSecondBounds}. */
export const getWholeSecondAbsoluteTimeRange = (timeRange: TimeRange, now: Date): TimeRange => {
  const { min, max } = calculateWholeSecondBounds(timeRange, now);
  return {
    from: min ? min.toISOString() : timeRange.from,
    to: max ? max.toISOString() : timeRange.to,
  };
};
