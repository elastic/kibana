/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { startsWith } from 'lodash';
import moment from 'moment';

export function timeShift(resp, panel, series) {
  return (next) => (results) => {
    if (/^([+-]?[\d]+)([shmdwMy]|ms)$/.test(series.offset_time)) {
      const matches = series.offset_time.match(/^([+-]?[\d]+)([shmdwMy]|ms)$/);

      if (matches) {
        const offsetValue = matches[1];
        const offsetUnit = matches[2];

        results.forEach((item) => {
          if (startsWith(item.id, series.id)) {
            item.data = item.data.map((row) => [
              moment.utc(row[0]).add(offsetValue, offsetUnit).valueOf(),
              row[1],
            ]);
          }
        });
      }
    }

    return next(results);
  };
}
