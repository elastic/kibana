/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { GTE_INTERVAL_RE } from './interval_regexp';
import { parseInterval, TimeRangeBounds } from '../../data/common';

export class ValidateIntervalError extends Error {
  constructor() {
    super(
      i18n.translate('visTypeTimeseries.validateInterval.notifier.maxBucketsExceededErrorMessage', {
        defaultMessage:
          'Your query attempted to fetch too much data. Reducing the time range or changing the interval used usually fixes the issue.',
      })
    );
  }

  public get name() {
    return this.constructor.name;
  }

  public get errBody() {
    return this.message;
  }
}

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
