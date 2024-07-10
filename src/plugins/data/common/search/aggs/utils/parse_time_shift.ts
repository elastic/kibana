/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import moment from 'moment';
import { getAbsoluteTimeRange } from '../../../query/timefilter/get_time';
import { TimeRange } from '../../../types';

const ALLOWED_UNITS = ['s', 'm', 'h', 'd', 'w', 'M', 'y'] as const;
const ANCHORED_TIME_SHIFT_REGEXP = /^(startAt|endAt)\((.+)\)$/;
const DURATION_REGEXP = /^(\d+)\s*(\w)$/;
const INVALID_DATE = 'invalid';
const PREVIOUS_DATE = 'previous';
const START_AT_ANCHOR = 'startAt';

type AllowedUnit = (typeof ALLOWED_UNITS)[number];
type PreviousDateType = typeof PREVIOUS_DATE;
type InvalidDateType = typeof INVALID_DATE;

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
export const parseTimeShift = (
  val: string
): moment.Duration | PreviousDateType | InvalidDateType => {
  const trimmedVal = val.trim();
  if (trimmedVal === PREVIOUS_DATE) {
    return PREVIOUS_DATE;
  }
  const [, amount, unit] = trimmedVal.match(DURATION_REGEXP) || [];
  const parsedAmount = Number(amount);
  if (Number.isNaN(parsedAmount) || !ALLOWED_UNITS.includes(unit as AllowedUnit)) {
    return INVALID_DATE;
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
  return val != null && ANCHORED_TIME_SHIFT_REGEXP.test(val);
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
):
  | { value: moment.Duration; reason: null }
  | { value: InvalidDateType; reason: REASON_ID_TYPES } => {
  const trimmedVal = val.trim();
  if (timeRange == null) {
    return {
      value: INVALID_DATE,
      reason: REASON_IDS.missingTimerange,
    };
  }
  const error = validateAbsoluteTimeShift(trimmedVal, timeRange);
  if (error) {
    return {
      value: INVALID_DATE,
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
  const absRangeEnd = anchor === START_AT_ANCHOR ? tsMoment.add(duration) : tsMoment;
  // return (ref end date - shift end date)
  return { value: moment.duration(moment(timeRange.to).diff(absRangeEnd)), reason: null };
};

/**
 * Fucntion to extract the anchor and timestamp tokens from an absolute time shift
 * @param val absolute time shift string
 * @returns the anchor and timestamp strings
 */
function extractTokensFromAbsTimeShift(val: string) {
  const [, anchor, timestamp] = val.match(ANCHORED_TIME_SHIFT_REGEXP) || [];
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
    const absTimeRange = getAbsoluteTimeRange(timeRange);
    const duration = moment(absTimeRange.to).diff(moment(absTimeRange.from));
    if (
      (anchor === START_AT_ANCHOR && tsMoment.isAfter(absTimeRange.from)) ||
      tsMoment.subtract(duration).isAfter(absTimeRange.from)
    )
      return REASON_IDS.shiftAfterTimeRange;
  }
}
