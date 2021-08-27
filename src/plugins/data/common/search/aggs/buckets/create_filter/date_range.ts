/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RangeFilterParams } from '@kbn/es-query';
import { buildRangeFilter } from '@kbn/es-query';
import moment from 'moment';
import type { DateRange } from '../../../expressions/date_range';
import type { IBucketAggConfig } from '../bucket_agg_type';

export const createFilterDateRange = (agg: IBucketAggConfig, { from, to }: DateRange) => {
  const filter: RangeFilterParams = {};
  if (from) filter.gte = moment(from).toISOString();
  if (to) filter.lt = moment(to).toISOString();
  if (to && from) filter.format = 'strict_date_optional_time';

  return buildRangeFilter(agg.params.field, filter, agg.getIndexPattern());
};
