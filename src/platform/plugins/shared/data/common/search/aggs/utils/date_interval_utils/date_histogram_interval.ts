/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseEsInterval } from './parse_es_interval';

type Interval = { fixed_interval: string } | { calendar_interval: string };

const calendarFixedConversion = {
  w: '7d',
  M: '30d',
  y: '365d',
};

/**
 * Checks whether a given Elasticsearch interval is a calendar or fixed interval
 * and returns an object containing the appropriate date_histogram property for that
 * interval. So it will return either an object containing the fixed_interval key for
 * that interval or a calendar_interval. If the specified interval was not a valid Elasticsearch
 * interval this method will throw an error.
 *
 * You can simply spread the returned value of this method into your date_histogram.
 * @example
 * const aggregation = {
 *   date_histogram: {
 *     field: 'date',
 *     ...dateHistogramInterval('24h'),
 *   }
 * };
 *
 * @param interval The interval string to return the appropriate date_histogram key for.
 */
export function dateHistogramInterval(interval: string, shouldForceFixed?: boolean): Interval {
  const { type, unit } = parseEsInterval(interval);
  if (type === 'calendar' && !shouldForceFixed) {
    return { calendar_interval: interval };
  } else {
    if (type === 'calendar') {
      return { fixed_interval: calendarFixedConversion[unit as 'w' | 'M' | 'y'] || interval };
    }
    return { fixed_interval: interval };
  }
}
