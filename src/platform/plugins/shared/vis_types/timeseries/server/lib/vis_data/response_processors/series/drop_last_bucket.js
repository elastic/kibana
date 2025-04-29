/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get } from 'lodash';
import { isLastValueTimerangeMode } from '../../helpers/get_timerange_mode';

export function dropLastBucket(resp, panel, series) {
  return (next) => (results) => {
    const shouldDropLastBucket = isLastValueTimerangeMode(panel, series);

    if (shouldDropLastBucket) {
      const dropLastBucket = series.override_index_pattern
        ? get(series, 'series_drop_last_bucket', 0)
        : get(panel, 'drop_last_bucket', 0);

      if (dropLastBucket) {
        results.forEach((item) => {
          item.data = item.data.slice(0, item.data.length - 1);
        });
      }
    }

    return next(results);
  };
}
