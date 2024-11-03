/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_RULE_INTERVAL } from '../constants';

const SECONDS_REGEX = /^[1-9][0-9]*s$/;
const MINUTES_REGEX = /^[1-9][0-9]*m$/;
const HOURS_REGEX = /^[1-9][0-9]*h$/;
const DAYS_REGEX = /^[1-9][0-9]*d$/;

const isSeconds = (duration: string) => {
  return SECONDS_REGEX.test(duration);
};

const isMinutes = (duration: string) => {
  return MINUTES_REGEX.test(duration);
};

const isHours = (duration: string) => {
  return HOURS_REGEX.test(duration);
};

const isDays = (duration: string) => {
  return DAYS_REGEX.test(duration);
};

// parse an interval string '{digit*}{s|m|h|d}' into milliseconds
export const parseDuration = (duration: string): number => {
  const parsed = parseInt(duration, 10);
  if (isSeconds(duration)) {
    return parsed * 1000;
  } else if (isMinutes(duration)) {
    return parsed * 60 * 1000;
  } else if (isHours(duration)) {
    return parsed * 60 * 60 * 1000;
  } else if (isDays(duration)) {
    return parsed * 24 * 60 * 60 * 1000;
  }
  throw new Error(
    `Invalid duration "${duration}". Durations must be of the form {number}x. Example: 5s, 5m, 5h or 5d"`
  );
};

export const formatDuration = (duration: string, fullUnit?: boolean): string => {
  const parsed = parseInt(duration, 10);
  if (isSeconds(duration)) {
    return `${parsed} ${fullUnit ? (parsed > 1 ? 'seconds' : 'second') : 'sec'}`;
  } else if (isMinutes(duration)) {
    return `${parsed} ${fullUnit ? (parsed > 1 ? 'minutes' : 'minute') : 'min'}`;
  } else if (isHours(duration)) {
    return `${parsed} ${fullUnit ? (parsed > 1 ? 'hours' : 'hour') : 'hr'}`;
  } else if (isDays(duration)) {
    return `${parsed} ${parsed > 1 ? 'days' : 'day'}`;
  }
  throw new Error(
    `Invalid duration "${duration}". Durations must be of the form {number}x. Example: 5s, 5m, 5h or 5d"`
  );
};

export const getDurationNumberInItsUnit = (duration: string): number => {
  return parseInt(duration.replace(/[^0-9.]/g, ''), 10);
};

export const getDurationUnitValue = (duration: string): string => {
  const durationNumber = getDurationNumberInItsUnit(duration);
  return duration.replace(durationNumber.toString(), '');
};

export const getInitialInterval = (minimumScheduleInterval?: string): string => {
  if (minimumScheduleInterval) {
    // return minimum schedule interval if it is larger than the default
    if (parseDuration(minimumScheduleInterval) > parseDuration(DEFAULT_RULE_INTERVAL)) {
      return minimumScheduleInterval;
    }
  }
  return DEFAULT_RULE_INTERVAL;
};
