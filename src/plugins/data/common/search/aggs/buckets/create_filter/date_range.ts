/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import moment from 'moment';
import { IBucketAggConfig } from '../bucket_agg_type';
import { DateRangeKey } from '../lib/date_range';
import { buildRangeFilter, RangeFilterParams } from '../../../../../common';

export const createFilterDateRange = (agg: IBucketAggConfig, { from, to }: DateRangeKey) => {
  const filter: RangeFilterParams = {};
  if (from) filter.gte = moment(from).toISOString();
  if (to) filter.lt = moment(to).toISOString();
  if (to && from) filter.format = 'strict_date_optional_time';

  return buildRangeFilter(agg.params.field, filter, agg.getIndexPattern());
};
