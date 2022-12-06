/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { keys } from 'lodash';
import type { RangeFilter } from '../build_filters';
import type { TimeRange } from './types';

export function convertRangeFilterToTimeRange(filter: RangeFilter) {
  const key = keys(filter.query.range)[0];
  const values = filter.query.range[key];

  return {
    from: moment(values.gt || values.gte),
    to: moment(values.lt || values.lte),
  };
}

export function convertRangeFilterToTimeRangeString(filter: RangeFilter): TimeRange {
  const { from, to } = convertRangeFilterToTimeRange(filter);
  return {
    from: from?.toISOString(),
    to: to?.toISOString(),
  };
}
