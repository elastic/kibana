/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import moment from 'moment';

const boundsDescending = [
  {
    bound: Infinity,
    interval: Number(moment.duration(1, 'year')),
  },
  {
    bound: Number(moment.duration(1, 'year')),
    interval: Number(moment.duration(1, 'month')),
  },
  {
    bound: Number(moment.duration(3, 'week')),
    interval: Number(moment.duration(1, 'week')),
  },
  {
    bound: Number(moment.duration(1, 'week')),
    interval: Number(moment.duration(1, 'd')),
  },
  {
    bound: Number(moment.duration(24, 'hour')),
    interval: Number(moment.duration(12, 'hour')),
  },
  {
    bound: Number(moment.duration(6, 'hour')),
    interval: Number(moment.duration(3, 'hour')),
  },
  {
    bound: Number(moment.duration(2, 'hour')),
    interval: Number(moment.duration(1, 'hour')),
  },
  {
    bound: Number(moment.duration(45, 'minute')),
    interval: Number(moment.duration(30, 'minute')),
  },
  {
    bound: Number(moment.duration(20, 'minute')),
    interval: Number(moment.duration(10, 'minute')),
  },
  {
    bound: Number(moment.duration(9, 'minute')),
    interval: Number(moment.duration(5, 'minute')),
  },
  {
    bound: Number(moment.duration(3, 'minute')),
    interval: Number(moment.duration(1, 'minute')),
  },
  {
    bound: Number(moment.duration(45, 'second')),
    interval: Number(moment.duration(30, 'second')),
  },
  {
    bound: Number(moment.duration(15, 'second')),
    interval: Number(moment.duration(10, 'second')),
  },
  {
    bound: Number(moment.duration(7.5, 'second')),
    interval: Number(moment.duration(5, 'second')),
  },
  {
    bound: Number(moment.duration(5, 'second')),
    interval: Number(moment.duration(1, 'second')),
  },
  {
    bound: Number(moment.duration(500, 'ms')),
    interval: Number(moment.duration(100, 'ms')),
  },
];

function getPerBucketMs(count: number, duration: number) {
  const ms = duration / count;
  return isFinite(ms) ? ms : NaN;
}

function normalizeMinimumInterval(targetMs: number) {
  const value = isNaN(targetMs) ? 0 : Math.max(Math.floor(targetMs), 1);
  return moment.duration(value);
}

/**
 * Using some simple rules we pick a "pretty" interval that will
 * produce around the number of buckets desired given a time range.
 *
 * @param targetBucketCount desired number of buckets
 * @param duration time range the agg covers
 */
export function calcAutoIntervalNear(targetBucketCount: number, duration: number) {
  const targetPerBucketMs = getPerBucketMs(targetBucketCount, duration);

  // Find the first bound which is smaller than our target.
  const lowerBoundIndex = boundsDescending.findIndex(({ bound }) => {
    const boundMs = Number(bound);
    return boundMs <= targetPerBucketMs;
  });

  // The bound immediately preceeding that lower bound contains the
  // interval most closely matching our target.
  if (lowerBoundIndex !== -1) {
    const nearestInterval = boundsDescending[lowerBoundIndex - 1].interval;
    return moment.duration(nearestInterval);
  }

  // If the target is smaller than any of our bounds, then we'll use it for the interval as-is.
  return normalizeMinimumInterval(targetPerBucketMs);
}

/**
 * Pick a "pretty" interval that produces no more than the maxBucketCount
 * for the given time range.
 *
 * @param maxBucketCount maximum number of buckets to create
 * @param duration amount of time covered by the agg
 */
export function calcAutoIntervalLessThan(maxBucketCount: number, duration: number) {
  const maxPerBucketMs = getPerBucketMs(maxBucketCount, duration);

  for (const { interval } of boundsDescending) {
    // Find the highest interval which meets our per bucket limitation.
    if (interval <= maxPerBucketMs) {
      return moment.duration(interval);
    }
  }

  // If the max is smaller than any of our intervals, then we'll use it for the interval as-is.
  return normalizeMinimumInterval(maxPerBucketMs);
}
