/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Unit } from '@kbn/datemath';
import { ianaTimeZoneOrUtc, pickDateRounding } from '@kbn/es-date-rounding';
import {
  getUnitValue,
  parseInterval,
  convertIntervalToUnit,
  ASCENDING_UNIT_ORDER,
} from './unit_to_seconds';
import { getTimerange } from './get_timerange';
import { INTERVAL_STRING_RE, GTE_INTERVAL_RE } from '../../../../common/interval_regexp';
import type { SearchCapabilities } from '../../search_strategies';
import type { VisTypeTimeseriesVisDataRequest } from '../../../types';

const calculateBucketData = (timeInterval: string, capabilities: SearchCapabilities) => {
  let intervalString = capabilities?.getValidTimeInterval(timeInterval) ?? timeInterval;

  const intervalStringMatch = intervalString.match(INTERVAL_STRING_RE);
  const parsedInterval = parseInterval(intervalString);

  let bucketSize =
    Number(intervalStringMatch?.[1] ?? 0) * getUnitValue(intervalStringMatch?.[2] as Unit);

  // don't go too small
  if (bucketSize < 1) {
    bucketSize = 1;
  }

  // Check decimal
  if (parsedInterval && parsedInterval.value % 1 !== 0) {
    if (parsedInterval.unit !== 'ms') {
      const converted = convertIntervalToUnit(
        intervalString,
        ASCENDING_UNIT_ORDER[ASCENDING_UNIT_ORDER.indexOf(parsedInterval.unit) - 1]
      );

      if (converted) {
        intervalString = converted.value + converted.unit;
      }
    } else {
      intervalString = '1ms';
    }
  }

  return {
    bucketSize,
    intervalString,
  };
};

export const getBucketSize = (
  req: VisTypeTimeseriesVisDataRequest,
  interval: string,
  capabilities: SearchCapabilities,
  bars: number
) => {
  const userIntervalMatches = Boolean(interval) && interval.match(INTERVAL_STRING_RE);

  if (userIntervalMatches) {
    return calculateBucketData(interval, capabilities);
  }

  const { from, to } = getTimerange(req);
  const picked = pickDateRounding(bars, {
    from: from.valueOf(),
    to: to.valueOf(),
    timeZone: ianaTimeZoneOrUtc(capabilities.timezone),
  });
  const autoBucketData = calculateBucketData(picked.expression, capabilities);
  if (autoBucketData.intervalString === picked.expression) {
    autoBucketData.bucketSize = Math.max(1, Math.round(picked.nominalMs / 1000));
  }

  const gteAutoMatch = Boolean(interval) && interval.match(GTE_INTERVAL_RE);

  if (gteAutoMatch) {
    const gteBucketData = calculateBucketData(gteAutoMatch[1], capabilities);
    const gteInSecondInterval = convertIntervalToUnit(gteBucketData.intervalString, 's');

    if (gteInSecondInterval && gteInSecondInterval.value > autoBucketData.bucketSize) {
      return gteBucketData;
    }
  }

  return autoBucketData;
};
