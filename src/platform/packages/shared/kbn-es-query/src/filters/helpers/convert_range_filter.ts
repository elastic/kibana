/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment, { type Moment } from 'moment';
import dateMath from '@kbn/datemath';
import { keys } from 'lodash';
import type { RangeFilter } from '../build_filters';
import type { TimeRange } from './types';

const isRelativeTime = (value: string | number | undefined): boolean => {
  return typeof value === 'string' && value.includes('now');
};

const calculateLowerBound = (from: string | number): undefined | Moment =>
  dateMath.parse(String(from));

const calculateUpperBound = (to: string | number): undefined | Moment =>
  dateMath.parse(String(to), { roundUp: true });

export function convertRangeFilterToTimeRange(filter: RangeFilter) {
  const key = keys(filter.query.range)[0];
  const values = filter.query.range[key];

  const from = values.gt || values.gte;
  const to = values.lt || values.lte;
  return {
    from: from && isRelativeTime(from) ? calculateLowerBound(from) ?? moment(from) : moment(from),
    to: to && isRelativeTime(to) ? calculateUpperBound(to) ?? moment(to) : moment(to),
  };
}

export function convertRangeFilterToTimeRangeString(filter: RangeFilter): TimeRange {
  const { from, to } = convertRangeFilterToTimeRange(filter);
  return {
    from: from?.toISOString(),
    to: to?.toISOString(),
  };
}
