/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';

import type { TimeRangeBounds } from '../../../../data/common';
import type { TimeseriesVisParams } from '../../types';

const JANUARY_MOMENT_CONFIG = { M: 0, d: 1 };

const containsDST = (bounds: TimeRangeBounds, timezone: string) => {
  const { min, max } = bounds;
  return moment.tz(min, timezone).isDST() || moment.tz(max, timezone).isDST();
};

const getIgnoredDSTRange = (bounds: TimeRangeBounds, timezone: string) => {
  const { min, max } = bounds;
  const januaryMoment = moment(JANUARY_MOMENT_CONFIG).tz(timezone);
  const januaryOffset = januaryMoment.utcOffset();
  const ignoreDSTTimeZone = januaryMoment.format('Z');

  return {
    min: moment(min).utcOffset(januaryOffset, true).utc(),
    max: moment(max).utcOffset(januaryOffset, true).utc(),
    timezone: ignoreDSTTimeZone,
  };
};

export function getIgnoredDstTimeRange(
  bounds: TimeRangeBounds,
  panel: TimeseriesVisParams,
  timezone: string
) {
  if (containsDST(bounds, timezone)) {
    return getIgnoredDSTRange(bounds, timezone);
  }
  return {
    timezone,
    ...bounds,
  };
}
