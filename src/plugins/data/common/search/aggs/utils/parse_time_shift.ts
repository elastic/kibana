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
const anchoredTimeShiftRegexp = /^(startAt|endAt)\((.+)\)$/;
const durationRegexp = /^(\d+)\s*(\w)$/;
const invalidDate = 'invalid';
const previousDate = 'previous';

// The ISO8601 format supports also partial date strings as described here:
// https://momentjs.com/docs/#/parsing/string/
// But in this specific case we want to enforce the full version of the ISO8601
// which is build in this case with moment special HTML5 format + the timezone support
const LONG_ISO8601_LIKE_FORMAT = moment.HTML5_FMT.DATETIME_LOCAL_MS + 'Z';

/**
 * This method parses a string into a time shift duration.
 * If parsing fails, 'invalid' is returned.
 * Allowed values are the string 'previous' and an integer followed by the units s,m,h,d,w,M,y
 *  */
export const parseTimeShift = (val: string): moment.Duration | 'previous' | 'invalid' => {
  const trimmedVal = val.trim();
  if (trimmedVal === previousDate) {
    return previousDate;
  }
  const [, amount, unit] = trimmedVal.match(durationRegexp) || [];
  const parsedAmount = Number(amount);
  if (Number.isNaN(parsedAmount) || !allowedUnits.includes(unit as AllowedUnit)) {
    return invalidDate;
  }
  return moment.duration(Number(amount), unit as AllowedUnit);
};

/**
 * Check function to detect an absolute time shift.
 * The check is performed only on the string format and the timestamp is not validated:
 * use the validateAbsoluteTimeShift fucntion to perform more in depth checks
 * @param val the string to parse (it assumes it has been trimmed already)
 * @returns true if an absolute time shift
 */
export const isAbsoluteTimeShift = (val?: string) => {
  return val != null && anchoredTimeShiftRegexp.test(val);
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
  if (timeRange == null) {
    return {
      value: invalidDate,
      reason: REASON_IDS.missingTimerange,
    };
  }
  const error = validateAbsoluteTimeShift(trimmedVal, timeRange);
  if (error) {
    return {
      value: invalidDate,
      reason: error,
    };
  }
  const { anchor, timestamp } = extractTokensFromAbsTimeShift(trimmedVal);
  // the regexp test above will make sure anchor and timestamp are both strings
  // now be very strict on the format
  const tsMoment = moment(timestamp, LONG_ISO8601_LIKE_FORMAT, true);
  // workout how long is the ref time range
  const duration = moment(timeRange.to).diff(moment(timeRange.from));
  // pick the end of the absolute range now
  const absRangeEnd = anchor === 'startAt' ? tsMoment.add(duration) : tsMoment;
  // return (ref end date - shift end date)
  return { value: moment.duration(moment(timeRange.to).diff(absRangeEnd)), reason: null };
};

/**
 * Fucntion to extract the anchor and timestamp tokens from an absolute time shift
 * @param val absolute time shift string
 * @returns the anchor and timestamp strings
 */
function extractTokensFromAbsTimeShift(val: string) {
  const [, anchor, timestamp] = val.match(anchoredTimeShiftRegexp) || [];
  return { anchor, timestamp };
}
/**
 * Relaxed version of the parsing validation
 * This version of the validation applies the timeRange validation only when passed
 * @param val
 * @param timeRange
 * @returns the reason id if the absolute shift is not valid, undefined otherwise
 */
export function validateAbsoluteTimeShift(
  val: string,
  timeRange?: TimeRange
): REASON_ID_TYPES | undefined {
  const trimmedVal = val.trim();
  if (!isAbsoluteTimeShift(trimmedVal)) {
    return REASON_IDS.notAbsoluteTimeShift;
  }
  const { anchor, timestamp } = extractTokensFromAbsTimeShift(trimmedVal);
  // the regexp test above will make sure anchor and timestamp are both strings
  // now be very strict on the format
  const tsMoment = moment(timestamp, LONG_ISO8601_LIKE_FORMAT, true);
  if (!tsMoment.isValid()) {
    return REASON_IDS.invalidDate;
  }
  if (timeRange) {
    const duration = moment(timeRange.to).diff(moment(timeRange.from));
    if (
      (anchor === 'startAt' && tsMoment.isAfter(timeRange.from)) ||
      tsMoment.subtract(duration).isAfter(timeRange.from)
    )
      return REASON_IDS.shiftAfterTimeRange;
  }
}
