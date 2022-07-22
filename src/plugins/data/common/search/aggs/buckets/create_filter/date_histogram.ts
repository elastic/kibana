/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment-timezone';
import { buildRangeFilter } from '@kbn/es-query';
import { IBucketDateHistogramAggConfig } from '../date_histogram';

export const createFilterDateHistogram = (
  agg: IBucketDateHistogramAggConfig,
  key: string | number
) => {
  const start = moment.tz(key, agg.aggConfigs.timeZone);
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
