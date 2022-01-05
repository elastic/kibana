/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { startsWith } from 'lodash';
import moment from 'moment';

export function timeShift(resp, panel, series, meta, extractFields, timezone) {
  const defaultTimezone = moment().zoneName();
  return (next) => (results) => {
    if (/^([+-]?[\d]+)([shmdwMy]|ms)$/.test(series.offset_time)) {
      moment.tz.setDefault(timezone);
      const matches = series.offset_time.match(/^([+-]?[\d]+)([shmdwMy]|ms)$/);
      if (matches) {
        const offsetValue = matches[1];
        const offsetUnit = matches[2];

        results.forEach((item) => {
          if (startsWith(item.id, series.id)) {
            item.data = item.data.map((row) => [
              moment(row[0]).add(offsetValue, offsetUnit).valueOf(),
              row[1],
            ]);
          }
        });
      }
    }

    // reset default moment timezone
    moment.tz.setDefault(defaultTimezone);

    return next(results);
  };
}
