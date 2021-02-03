/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment';

export const boundsDescendingRaw = [
  {
    bound: Infinity,
    interval: moment.duration(1, 'year'),
    boundLabel: i18n.translate('data.search.timeBuckets.infinityLabel', {
      defaultMessage: 'More than a year',
    }),
    intervalLabel: i18n.translate('data.search.timeBuckets.yearLabel', {
      defaultMessage: 'a year',
    }),
  },
  {
    bound: moment.duration(1, 'year'),
    interval: moment.duration(1, 'month'),
    boundLabel: i18n.translate('data.search.timeBuckets.yearLabel', {
      defaultMessage: 'a year',
    }),
    intervalLabel: i18n.translate('data.search.timeBuckets.monthLabel', {
      defaultMessage: 'a month',
    }),
  },
  {
    bound: moment.duration(3, 'week'),
    interval: moment.duration(1, 'week'),
    boundLabel: i18n.translate('data.search.timeBuckets.dayLabel', {
      defaultMessage: '{amount, plural, one {a day} other {# days}}',
      values: { amount: 21 },
    }),
    intervalLabel: i18n.translate('data.search.timeBuckets.dayLabel', {
      defaultMessage: '{amount, plural, one {a day} other {# days}}',
      values: { amount: 7 },
    }),
  },
  {
    bound: moment.duration(1, 'week'),
    interval: moment.duration(1, 'd'),
    boundLabel: i18n.translate('data.search.timeBuckets.dayLabel', {
      defaultMessage: '{amount, plural, one {a day} other {# days}}',
      values: { amount: 7 },
    }),
    intervalLabel: i18n.translate('data.search.timeBuckets.dayLabel', {
      defaultMessage: '{amount, plural, one {a day} other {# days}}',
      values: { amount: 1 },
    }),
  },
  {
    bound: moment.duration(24, 'hour'),
    interval: moment.duration(12, 'hour'),
    boundLabel: i18n.translate('data.search.timeBuckets.dayLabel', {
      defaultMessage: '{amount, plural, one {a day} other {# days}}',
      values: { amount: 1 },
    }),
    intervalLabel: i18n.translate('data.search.timeBuckets.hourLabel', {
      defaultMessage: '{amount, plural, one {an hour} other {# hours}}',
      values: { amount: 12 },
    }),
  },
  {
    bound: moment.duration(6, 'hour'),
    interval: moment.duration(3, 'hour'),
    boundLabel: i18n.translate('data.search.timeBuckets.hourLabel', {
      defaultMessage: '{amount, plural, one {an hour} other {# hours}}',
      values: { amount: 6 },
    }),
    intervalLabel: i18n.translate('data.search.timeBuckets.hourLabel', {
      defaultMessage: '{amount, plural, one {an hour} other {# hours}}',
      values: { amount: 3 },
    }),
  },
  {
    bound: moment.duration(2, 'hour'),
    interval: moment.duration(1, 'hour'),
    boundLabel: i18n.translate('data.search.timeBuckets.hourLabel', {
      defaultMessage: '{amount, plural, one {an hour} other {# hours}}',
      values: { amount: 2 },
    }),
    intervalLabel: i18n.translate('data.search.timeBuckets.hourLabel', {
      defaultMessage: '{amount, plural, one {an hour} other {# hours}}',
      values: { amount: 1 },
    }),
  },
  {
    bound: moment.duration(45, 'minute'),
    interval: moment.duration(30, 'minute'),
    boundLabel: i18n.translate('data.search.timeBuckets.minuteLabel', {
      defaultMessage: '{amount, plural, one {a minute} other {# minutes}}',
      values: { amount: 45 },
    }),
    intervalLabel: i18n.translate('data.search.timeBuckets.minuteLabel', {
      defaultMessage: '{amount, plural, one {a minute} other {# minutes}}',
      values: { amount: 30 },
    }),
  },
  {
    bound: moment.duration(20, 'minute'),
    interval: moment.duration(10, 'minute'),
    boundLabel: i18n.translate('data.search.timeBuckets.minuteLabel', {
      defaultMessage: '{amount, plural, one {a minute} other {# minutes}}',
      values: { amount: 20 },
    }),
    intervalLabel: i18n.translate('data.search.timeBuckets.minuteLabel', {
      defaultMessage: '{amount, plural, one {a minute} other {# minutes}}',
      values: { amount: 10 },
    }),
  },
  {
    bound: moment.duration(9, 'minute'),
    interval: moment.duration(5, 'minute'),
    boundLabel: i18n.translate('data.search.timeBuckets.minuteLabel', {
      defaultMessage: '{amount, plural, one {a minute} other {# minutes}}',
      values: { amount: 9 },
    }),
    intervalLabel: i18n.translate('data.search.timeBuckets.minuteLabel', {
      defaultMessage: '{amount, plural, one {a minute} other {# minutes}}',
      values: { amount: 5 },
    }),
  },
  {
    bound: moment.duration(3, 'minute'),
    interval: moment.duration(1, 'minute'),
    boundLabel: i18n.translate('data.search.timeBuckets.minuteLabel', {
      defaultMessage: '{amount, plural, one {a minute} other {# minutes}}',
      values: { amount: 3 },
    }),
    intervalLabel: i18n.translate('data.search.timeBuckets.minuteLabel', {
      defaultMessage: '{amount, plural, one {a minute} other {# minutes}}',
      values: { amount: 1 },
    }),
  },
  {
    bound: moment.duration(45, 'second'),
    interval: moment.duration(30, 'second'),
    boundLabel: i18n.translate('data.search.timeBuckets.secondLabel', {
      defaultMessage: '{amount, plural, one {a second} other {# seconds}}',
      values: { amount: 45 },
    }),
    intervalLabel: i18n.translate('data.search.timeBuckets.secondLabel', {
      defaultMessage: '{amount, plural, one {a second} other {# seconds}}',
      values: { amount: 30 },
    }),
  },
  {
    bound: moment.duration(15, 'second'),
    interval: moment.duration(10, 'second'),
    boundLabel: i18n.translate('data.search.timeBuckets.secondLabel', {
      defaultMessage: '{amount, plural, one {a second} other {# seconds}}',
      values: { amount: 15 },
    }),
    intervalLabel: i18n.translate('data.search.timeBuckets.secondLabel', {
      defaultMessage: '{amount, plural, one {a second} other {# seconds}}',
      values: { amount: 10 },
    }),
  },
  {
    bound: moment.duration(7.5, 'second'),
    interval: moment.duration(5, 'second'),
    boundLabel: i18n.translate('data.search.timeBuckets.secondLabel', {
      defaultMessage: '{amount, plural, one {a second} other {# seconds}}',
      values: { amount: 7.5 },
    }),
    intervalLabel: i18n.translate('data.search.timeBuckets.secondLabel', {
      defaultMessage: '{amount, plural, one {a second} other {# seconds}}',
      values: { amount: 5 },
    }),
  },
  {
    bound: moment.duration(5, 'second'),
    interval: moment.duration(1, 'second'),
    boundLabel: i18n.translate('data.search.timeBuckets.secondLabel', {
      defaultMessage: '{amount, plural, one {a second} other {# seconds}}',
      values: { amount: 5 },
    }),
    intervalLabel: i18n.translate('data.search.timeBuckets.secondLabel', {
      defaultMessage: '{amount, plural, one {a second} other {# seconds}}',
      values: { amount: 1 },
    }),
  },
  {
    bound: moment.duration(500, 'ms'),
    interval: moment.duration(100, 'ms'),
    boundLabel: i18n.translate('data.search.timeBuckets.millisecondLabel', {
      defaultMessage: '{amount, plural, one {a millisecond} other {# milliseconds}}',
      values: { amount: 500 },
    }),
    intervalLabel: i18n.translate('data.search.timeBuckets.millisecondLabel', {
      defaultMessage: '{amount, plural, one {a millisecond} other {# milliseconds}}',
      values: { amount: 100 },
    }),
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
