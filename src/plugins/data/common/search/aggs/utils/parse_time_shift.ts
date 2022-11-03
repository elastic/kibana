/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import moment from 'moment';
import { TimeRange } from '../../../types';

const allowedUnits = ['s', 'm', 'h', 'd', 'w', 'M', 'y'] as const;
type AllowedUnit = typeof allowedUnits[number];
const anchoredTimeShiftRegexp = /^(start|end)( - )(.+)$/;
const durationRegexp = /^(\d+)\s*(\w)$/;

/**
 * This method parses a string into a time shift duration.
 * If parsing fails, 'invalid' is returned.
 * Allowed values are the string 'previous' and an integer followed by the units s,m,h,d,w,M,y
 *  */
export const parseTimeShift = (val: string): moment.Duration | 'previous' | 'invalid' => {
  const trimmedVal = val.trim();
  if (trimmedVal === 'previous') {
    return 'previous';
  }
  const [, amount, unit] = trimmedVal.match(durationRegexp) || [];
  const parsedAmount = Number(amount);
  if (Number.isNaN(parsedAmount) || !allowedUnits.includes(unit as AllowedUnit)) {
    return 'invalid';
  }
  return moment.duration(Number(amount), unit as AllowedUnit);
};

/**
 * Check function to detect an absolute time shift
 * @param val the string to parse (it assumes it has been trimmed already)
 * @returns true if an absolute time shift
 */
export const isAbsoluteTimeShift = (val: string | undefined) => {
  return val && anchoredTimeShiftRegexp.test(val);
};

export const REASON_IDS = {
  missingTimerange: 'missingTimerange',
  notAbsoluteTimeShift: 'notAbsoluteTimeShift',
  invalidDate: 'invalidDate',
  shiftAfterTimeRange: 'shiftAfterTimeRange',
} as const;

export type REASON_ID_TYPES = keyof typeof REASON_IDS;

/**
 * Parses an absolute time shift string and returns its equivalent duration
 * @param val the string to parse
 * @param timeRange the current date histogram interval
 * @returns
 */
export const parseAbsoluteTimeShift = (
  val: string,
  timeRange: TimeRange | undefined
): { value: moment.Duration; reason: null } | { value: 'invalid'; reason: REASON_ID_TYPES } => {
  const trimmedVal = val.trim();
  if (timeRange == null || !isAbsoluteTimeShift(trimmedVal)) {
    return {
      value: 'invalid',
      reason: timeRange == null ? REASON_IDS.missingTimerange : REASON_IDS.notAbsoluteTimeShift,
    };
  }
  const { anchor, timestamp } = extractTokensFromAbsTimeShift(trimmedVal);
  // the regexp test above will make sure anchor and timestamp are both strings
  // now be very strict on the format
  const tsMoment = moment(timestamp, moment.ISO_8601, true);
  if (!tsMoment.isValid() || tsMoment.isAfter(timeRange.to)) {
    return {
      value: 'invalid',
      reason: !tsMoment.isValid() ? REASON_IDS.invalidDate : REASON_IDS.shiftAfterTimeRange,
    };
  }
  // workout how long is the ref time range
  const duration = moment(timeRange.to).diff(moment(timeRange.from));
  // pick the end of the absolute range now
  const absRangeEnd = anchor === 'start' ? tsMoment : tsMoment.add(duration);
  // return (ref end date - shift end date)
  return { value: moment.duration(moment(timeRange.to).diff(absRangeEnd)), reason: null };
};

export function extractTokensFromAbsTimeShift(val: string) {
  const [, anchor, , timestamp] = val.match(anchoredTimeShiftRegexp) || [];
  return { anchor, timestamp };
}
