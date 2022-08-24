/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dateMath from '@kbn/datemath';
import type { RefreshInterval } from '@kbn/data-plugin/common';

export function isTimeRangeValid(timeRange?: { from: string; to: string }): boolean {
  if (!timeRange?.from || !timeRange?.to) {
    return false;
  }
  const fromMoment = dateMath.parse(timeRange.from);
  const toMoment = dateMath.parse(timeRange.to);
  return Boolean(fromMoment && toMoment && fromMoment.isValid() && toMoment.isValid());
}

export function isRefreshIntervalValid(refreshInterval?: RefreshInterval): boolean {
  if (!refreshInterval) {
    return false;
  }
  return (
    typeof refreshInterval?.value === 'number' &&
    refreshInterval?.value >= 0 &&
    typeof refreshInterval?.pause === 'boolean'
  );
}
