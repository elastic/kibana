/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { dropLastBucket } from '../series/drop_last_bucket';
import { isLastValueTimerangeMode } from '../../helpers/get_timerange_mode';

export function dropLastBucketFn(bucket, panel, series) {
  return (next) => (results) => {
    const shouldDropLastBucket = isLastValueTimerangeMode(panel);

    if (shouldDropLastBucket) {
      const fn = dropLastBucket({ aggregations: bucket }, panel, series);

      return fn(next)(results);
    }

    return next(results);
  };
}
