/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import moment from 'moment';
import { IBucketDateHistogramAggConfig } from '../date_histogram';
import { buildRangeFilter } from '../../../../../common';

export const createFilterDateHistogram = (
  agg: IBucketDateHistogramAggConfig,
  key: string | number
) => {
  const start = moment(key);
  const interval = agg.buckets.getInterval();

  return buildRangeFilter(
    agg.params.field,
    {
      gte: start.toISOString(),
      lt: start.add(interval).toISOString(),
      format: 'strict_date_optional_time',
    },
    agg.getIndexPattern()
  );
};
