/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment-timezone';
import splitInterval from './split_interval';

export default function (tlConfig) {
  const targetSeries = [];
  // The code between this call and the reset in the finally block is not allowed to get async,
  // otherwise the timezone setting can leak out of this function.
  const defaultTimezone = moment().zoneName();
  try {
    moment.tz.setDefault(tlConfig.time.timezone);
    const min = moment(tlConfig.time.from);
    const max = moment(tlConfig.time.to);

    const intervalParts = splitInterval(tlConfig.time.interval);

    let current = min.startOf(intervalParts.unit);

    while (current.valueOf() < max.valueOf()) {
      targetSeries.push(current.valueOf());
      current = current.add(intervalParts.count, intervalParts.unit);
    }
  } finally {
    // reset default moment timezone
    moment.tz.setDefault(defaultTimezone);
  }

  return targetSeries;
}
