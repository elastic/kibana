/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { TimeRange } from '@kbn/es-query';

// follows the same logic with vega auto_date function
// we could move to a package and reuse in the future
const barTarget = 50; // same as vega
const roundInterval = (interval: number) => {
  {
    switch (true) {
      case interval <= 500: // <= 0.5s
        return '100 millisecond';
      case interval <= 5000: // <= 5s
        return '1 second';
      case interval <= 7500: // <= 7.5s
        return '5 second';
      case interval <= 15000: // <= 15s
        return '10 second';
      case interval <= 45000: // <= 45s
        return '30 second';
      case interval <= 180000: // <= 3m
        return '1 minute';
      case interval <= 450000: // <= 9m
        return '5 minute';
      case interval <= 1200000: // <= 20m
        return '10 minute';
      case interval <= 2700000: // <= 45m
        return '30 minute';
      case interval <= 7200000: // <= 2h
        return '1 hour';
      case interval <= 21600000: // <= 6h
        return '3 hour';
      case interval <= 86400000: // <= 24h
        return '12 hour';
      case interval <= 604800000: // <= 1w
        return '24 hour';
      case interval <= 1814400000: // <= 3w
        return '1 week';
      case interval < 3628800000: // <  2y
        return '30 day';
      default:
        return '1 year';
    }
  }
};

export const computeInterval = (timeRange: TimeRange, data: DataPublicPluginStart): string => {
  const bounds = data.query.timefilter.timefilter.calculateBounds(timeRange!);
  const min = bounds.min!.valueOf();
  const max = bounds.max!.valueOf();
  const interval = (max - min) / barTarget;
  return roundInterval(interval);
};
