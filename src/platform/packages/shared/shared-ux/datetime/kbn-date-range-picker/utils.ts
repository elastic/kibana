/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DATE_TYPE_NOW } from './constants';
import type { TimeRange } from './types';

/**
 * Check a time range is valid
 */
export function isValidTimeRange(range: TimeRange): boolean {
  const { startDate, endDate, type } = range;
  // both dates are valid
  if (startDate === null || endDate === null) {
    return false;
  }
  // [NOW, NOW] is not a valid range (zero duration)
  if (type[0] === DATE_TYPE_NOW && type[1] === DATE_TYPE_NOW) {
    return false;
  }
  // start must be before or equal to end
  return startDate.getTime() <= endDate.getTime();
}
