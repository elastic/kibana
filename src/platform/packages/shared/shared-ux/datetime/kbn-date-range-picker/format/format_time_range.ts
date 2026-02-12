/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';

import {
  DATE_RANGE_DISPLAY_DELIMITER,
  DEFAULT_DATE_FORMAT,
  FORMAT_NO_YEAR,
  FORMAT_TIME_ONLY,
  UNIT_SHORT_TO_FULL_MAP,
  DATE_TYPE_ABSOLUTE,
  DATE_TYPE_NOW,
} from '../constants';
import type { TimeRange, TimeRangeTransformOptions } from '../types';

/**
 * Converts a parsed TimeRange into a human-readable display string.
 */
export function timeRangeToDisplayText(
  timeRange: TimeRange,
  options?: TimeRangeTransformOptions
): string {
  const { delimiter = DATE_RANGE_DISPLAY_DELIMITER, dateFormat = DEFAULT_DATE_FORMAT } =
    options ?? {};

  if (timeRange.isInvalid) {
    return timeRange.value;
  }
  if (timeRange.isNaturalLanguage) {
    // capitalize
    const { value } = timeRange;
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  let startDateFormat = dateFormat;
  let endDateFormat = dateFormat;

  // Abbreviate absolute dates a little when using default format
  if (timeRange.type.includes(DATE_TYPE_ABSOLUTE) && dateFormat === DEFAULT_DATE_FORMAT) {
    const currentYear = new Date().getFullYear();
    const startYear = timeRange.startDate?.getFullYear();
    const endYear = timeRange.endDate?.getFullYear();
    const startIsNow = timeRange.type[0] === DATE_TYPE_NOW;
    const endIsNow = timeRange.type[1] === DATE_TYPE_NOW;

    // Hide year if both dates are in the current year, or one part is "now"
    const startInCurrentYear = startIsNow || startYear === currentYear;
    const endInCurrentYear = endIsNow || endYear === currentYear;
    if (startInCurrentYear && endInCurrentYear) {
      startDateFormat = FORMAT_NO_YEAR;
      endDateFormat = FORMAT_NO_YEAR;
    }

    // Show only time for end date if both dates are on the same day
    if (
      timeRange.startDate &&
      timeRange.endDate &&
      timeRange.startDate.toDateString() === timeRange.endDate.toDateString()
    ) {
      endDateFormat = FORMAT_TIME_ONLY;
    }
  }

  const startDisplay = formatDateInstant(timeRange.start, timeRange.startDate, startDateFormat);
  const endDisplay = formatDateInstant(timeRange.end, timeRange.endDate, endDateFormat);

  return `${startDisplay} ${delimiter.trim()} ${endDisplay}`;
}

/**
 * Formats a single date instant for display.
 * Converts date math to natural language where possible.
 */
function formatDateInstant(dateString: string, date: Date | null, dateFormat: string): string {
  // "now" stays as "now"
  if (dateString === 'now') {
    return 'now';
  }

  // Try to parse as relative date math: now-7m, now+3d, etc.
  const relativeParts = dateMathToRelativeParts(dateString);
  if (relativeParts) {
    return formatRelativeTime(relativeParts.count, relativeParts.unit, relativeParts.isFuture);
  }

  // For absolute dates, format using the date object
  if (date) {
    return formatAbsoluteInstant(date, dateFormat);
  }

  // Fallback: return original string
  return dateString;
}

/**
 * Parses date math like "now-7m" or "now+3d/d" into parts
 */
function dateMathToRelativeParts(
  value: string
): { count: number; unit: string; isFuture: boolean; round?: string } | null {
  const match = value.match(/^now([+-])(\d+)([smhdwMy])(\/[smhdwMy])?$/);
  if (!match) {
    return null;
  }

  const [, operator, count, unit, round] = match;
  return {
    count: parseInt(count, 10),
    unit,
    isFuture: operator === '+',
    round: round?.slice(1), // Remove the leading "/"
  };
}

/**
 * Formats relative time as natural language.
 * e.g., (7, 'm', false) => "7 minutes ago"
 * e.g., (3, 'd', true) => "3 days from now"
 *
 * TODO: translate the output of this function
 * using @kbn/i18n with ICU plural syntax for each unit/direction combination.
 * Other user-facing strings in this file (e.g. "now", the delimiter) also need
 * to be translated.
 * https://github.com/elastic/eui-private/issues/534
 */
function formatRelativeTime(count: number, unit: string, isFuture: boolean): string {
  const unitName = UNIT_SHORT_TO_FULL_MAP[unit] || unit;
  const plural = count === 1 ? '' : 's';
  const direction = isFuture ? 'from now' : 'ago';

  return `${count} ${unitName}${plural} ${direction}`;
}

/**
 * Formats an absolute date for display using a moment format string.
 */
function formatAbsoluteInstant(date: Date, dateFormat: string = DEFAULT_DATE_FORMAT): string {
  return moment(date).format(dateFormat);
}
