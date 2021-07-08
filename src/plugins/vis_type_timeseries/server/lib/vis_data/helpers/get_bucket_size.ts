/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Unit } from '@elastic/datemath';

import {
  getUnitValue,
  parseInterval,
  convertIntervalToUnit,
  ASCENDING_UNIT_ORDER,
} from './unit_to_seconds';
import { getTimerange } from './get_timerange';
import { INTERVAL_STRING_RE, GTE_INTERVAL_RE } from '../../../../common/interval_regexp';
import { search } from '../../../../../data/server';
import type { SearchCapabilities } from '../../search_strategies';
import type { VisTypeTimeseriesVisDataRequest } from '../../../types';

const calculateBucketData = (timeInterval: string, capabilities: SearchCapabilities) => {
  let intervalString = capabilities
    ? capabilities.getValidTimeInterval(timeInterval)
    : timeInterval;
  const intervalStringMatch = intervalString.match(INTERVAL_STRING_RE);
  const parsedInterval = parseInterval(intervalString);

  let bucketSize =
    Number(intervalStringMatch?.[1] ?? 0) * getUnitValue(intervalStringMatch?.[2] as Unit);

  // don't go too small
  if (bucketSize < 1) {
    bucketSize = 1;
  }

  if (bucketSize > capabilities.maxBucketsLimit) {
    bucketSize = capabilities.maxBucketsLimit;
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

const calculateBucketSizeForAutoInterval = (
  req: VisTypeTimeseriesVisDataRequest,
  maxBars: number
) => {
  const { from, to } = getTimerange(req);
  const timerange = to.valueOf() - from.valueOf();

  return search.aggs.calcAutoIntervalLessThan(maxBars, timerange).asSeconds();
};

export const getBucketSize = (
  req: VisTypeTimeseriesVisDataRequest,
  interval: string,
  capabilities: SearchCapabilities,
  bars: number
) => {
  const defaultBucketSize = calculateBucketSizeForAutoInterval(req, bars);
  let intervalString = `${defaultBucketSize}s`;

  const gteAutoMatch = Boolean(interval) && interval.match(GTE_INTERVAL_RE);

  if (gteAutoMatch) {
    const bucketData = calculateBucketData(gteAutoMatch[1], capabilities);

    if (bucketData.bucketSize >= defaultBucketSize) {
      return bucketData;
    }
  }

  const matches = interval && interval.match(INTERVAL_STRING_RE);

  if (matches) {
    intervalString = interval;
  }

  return calculateBucketData(intervalString, capabilities);
};
