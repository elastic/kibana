/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { GTE_INTERVAL_RE } from '../../../common/interval_regexp';
import { i18n } from '@kbn/i18n';
import { search } from '../../../../../plugins/data/public';
const { parseInterval } = search.aggs;

export function validateInterval(bounds, panel, maxBuckets) {
  const { interval } = panel;
  const { min, max } = bounds;
  // No need to check auto it will return around 100
  if (!interval) return;
  if (interval === 'auto') return;
  const greaterThanMatch = interval.match(GTE_INTERVAL_RE);
  if (greaterThanMatch) return;
  const duration = parseInterval(interval);
  if (duration) {
    const span = max.valueOf() - min.valueOf();
    const buckets = Math.floor(span / duration.asMilliseconds());
    if (buckets > maxBuckets) {
      throw new Error(
        i18n.translate(
          'visTypeTimeseries.validateInterval.notifier.maxBucketsExceededErrorMessage',
          {
            defaultMessage:
              'Your query attempted to fetch too much data. Reducing the time range or changing the interval used usually fixes the issue.',
          }
        )
      );
    }
  }
}
