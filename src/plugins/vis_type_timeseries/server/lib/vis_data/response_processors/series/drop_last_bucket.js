/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { get } from 'lodash';
import { isLastValueTimerangeMode } from '../../helpers/get_timerange_mode';

export function dropLastBucket(resp, panel, series) {
  return (next) => (results) => {
    const shouldDropLastBucket = isLastValueTimerangeMode(panel, series);

    if (shouldDropLastBucket) {
      const seriesDropLastBucket = get(series, 'override_drop_last_bucket', 1);
      const dropLastBucket = get(panel, 'drop_last_bucket', seriesDropLastBucket);

      if (dropLastBucket) {
        results.forEach((item) => {
          item.data = item.data.slice(0, item.data.length - 1);
        });
      }
    }

    return next(results);
  };
}
