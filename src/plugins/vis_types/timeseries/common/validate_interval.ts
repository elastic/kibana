/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parseInterval, TimeRangeBounds } from '@kbn/data-plugin/common';
import { GTE_INTERVAL_RE } from './interval_regexp';
import { ValidateIntervalError } from './errors';

export function validateInterval(bounds: TimeRangeBounds, interval: string, maxBuckets: number) {
  const { min, max } = bounds;
  // No need to check auto it will return around 100
  if (!interval) return;
  if (interval === 'auto') return;
  const greaterThanMatch = interval.match(GTE_INTERVAL_RE);
  if (greaterThanMatch) return;
  const duration = parseInterval(interval);

  if (duration) {
    const span = max!.valueOf() - min!.valueOf();
    const buckets = Math.floor(span / duration.asMilliseconds());
    if (buckets > maxBuckets) {
      throw new ValidateIntervalError();
    }
  }
}
