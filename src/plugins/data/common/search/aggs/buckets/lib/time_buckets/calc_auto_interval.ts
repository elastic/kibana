/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';

import {
  dayLabel,
  hourLabel,
  yearLabel,
  minuteLabel,
  secondLabel,
  millisecondLabel,
  infinityLabel,
  monthLabel,
} from './i18n_messages';

export const boundsDescendingRaw = [
  {
    bound: Infinity,
    interval: moment.duration(1, 'year'),
    boundLabel: infinityLabel(),
    intervalLabel: yearLabel(),
  },
  {
    bound: moment.duration(1, 'year'),
    interval: moment.duration(1, 'month'),
    boundLabel: yearLabel(),
    intervalLabel: monthLabel(),
  },
  {
    bound: moment.duration(3, 'week'),
    interval: moment.duration(1, 'week'),
    boundLabel: dayLabel(21),
    intervalLabel: dayLabel(7),
  },
  {
    bound: moment.duration(1, 'week'),
    interval: moment.duration(1, 'd'),
    boundLabel: dayLabel(7),
    intervalLabel: dayLabel(1),
  },
  {
    bound: moment.duration(24, 'hour'),
    interval: moment.duration(12, 'hour'),
    boundLabel: dayLabel(1),
    intervalLabel: hourLabel(12),
  },
  {
    bound: moment.duration(6, 'hour'),
    interval: moment.duration(3, 'hour'),
    boundLabel: hourLabel(6),
    intervalLabel: hourLabel(3),
  },
  {
    bound: moment.duration(2, 'hour'),
    interval: moment.duration(1, 'hour'),
    boundLabel: hourLabel(2),
    intervalLabel: hourLabel(1),
  },
  {
    bound: moment.duration(45, 'minute'),
    interval: moment.duration(30, 'minute'),
    boundLabel: minuteLabel(45),
    intervalLabel: minuteLabel(30),
  },
  {
    bound: moment.duration(20, 'minute'),
    interval: moment.duration(10, 'minute'),
    boundLabel: minuteLabel(20),
    intervalLabel: minuteLabel(10),
  },
  {
    bound: moment.duration(9, 'minute'),
    interval: moment.duration(5, 'minute'),
    boundLabel: minuteLabel(9),
    intervalLabel: minuteLabel(5),
  },
  {
    bound: moment.duration(3, 'minute'),
    interval: moment.duration(1, 'minute'),
    boundLabel: minuteLabel(3),
    intervalLabel: minuteLabel(1),
  },
  {
    bound: moment.duration(45, 'second'),
    interval: moment.duration(30, 'second'),
    boundLabel: secondLabel(45),
    intervalLabel: secondLabel(30),
  },
  {
    bound: moment.duration(15, 'second'),
    interval: moment.duration(10, 'second'),
    boundLabel: secondLabel(15),
    intervalLabel: secondLabel(10),
  },
  {
    bound: moment.duration(7.5, 'second'),
    interval: moment.duration(5, 'second'),
    boundLabel: secondLabel(7.5),
    intervalLabel: secondLabel(5),
  },
  {
    bound: moment.duration(5, 'second'),
    interval: moment.duration(1, 'second'),
    boundLabel: secondLabel(5),
    intervalLabel: secondLabel(1),
  },
  {
    bound: moment.duration(500, 'ms'),
    interval: moment.duration(100, 'ms'),
    boundLabel: millisecondLabel(500),
    intervalLabel: millisecondLabel(100),
  },
];

const boundsDescending = boundsDescendingRaw.map(({ bound, interval }) => ({
  bound: Number(bound),
  interval: Number(interval),
}));

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
