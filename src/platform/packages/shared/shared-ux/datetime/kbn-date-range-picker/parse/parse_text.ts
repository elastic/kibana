/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dateMath from '@elastic/datemath';
import moment from 'moment';

import {
  DATE_TYPE_ABSOLUTE,
  DATE_TYPE_NOW,
  DATE_TYPE_RELATIVE,
  DATE_RANGE_INPUT_DELIMITER,
  DEFAULT_DATE_FORMAT,
  FORMAT_NO_YEAR,
  UNIT_FULL_TO_SHORT_MAP,
} from '../constants';
import type { DateType, DateString, TimeRange, TimeRangeTransformOptions } from '../types';
import { isValidTimeRange } from '../utils';

/**
 * Creates a TimeRange, automatically computing `isInvalid` from the range fields.
 */
function buildTimeRange(fields: Omit<TimeRange, 'isInvalid'>): TimeRange {
  const range: TimeRange = { ...fields, isInvalid: true };
  range.isInvalid = !isValidTimeRange(range);
  return range;
}

// Shorthand: "-7m", "+7d", "now-7m", "now+7d/d"
const SHORTHAND_REGEX = /^(now)?([+-])(\d+)([smhdwMy])(\/[smhdwMy])?$/i;

// (works because parsing of end is done with `roundUp` true)
const NAMED_RANGES: Record<string, { start: string; end: string }> = {
  today: { start: 'now/d', end: 'now/d' },
  yesterday: { start: 'now-1d/d', end: 'now-1d/d' },
  tomorrow: { start: 'now+1d/d', end: 'now+1d/d' },
};

// "last 7 minutes" or "next 7 minutes"
const NATURAL_DURATION_REGEX = /^(last|next)\s+(\d+)\s+(\w+)$/i;

// "7 minutes ago" or "7 minutes from now"
const NATURAL_INSTANT_REGEX = /^(\d+)\s+(\w+)\s+(ago|from now)$/i;

// TODO this will change when we improve "forgivingness"
// see https://github.com/elastic/eui/pull/9199
const SUPPORTED_DATE_FORMATS = [
  DEFAULT_DATE_FORMAT, // 'MMM D YYYY, HH:mm'
  FORMAT_NO_YEAR, // 'MMM D, HH:mm'
  'MMM D YYYY', // e.g. "Feb 3 2016"
  'MMM D, YYYY', // e.g. "feb 3, 2016"
  'YYYY-MM-DD',
  'YYYY-MM-DDTHH:mm:ss.SSSZ',
  'YYYY-MM-DDTHH:mm:ssZ',
  'YYYY-MM-DDTHH:mm',
];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getDelimiterPattern = (delimiter: string) => {
  const normalized = delimiter.trim();
  if (!normalized) {
    return null;
  }

  return new RegExp(`^(.+?)\\s+${escapeRegExp(normalized)}\\s+(.+)$`);
};

/**
 * Main parsing function to transform text into a time range
 *
 * TODO: Move preset matching out of this function into a separate step (e.g. `matchPreset`),
 * so this function stays focused on text parsing only.
 */
export function textToTimeRange(text: string, options?: TimeRangeTransformOptions): TimeRange {
  const trimmed = text.trim();
  const { presets = [], delimiter = DATE_RANGE_INPUT_DELIMITER } = options ?? {};
  const delimiterPattern = getDelimiterPattern(delimiter);

  const invalidResult: TimeRange = {
    value: text,
    start: '',
    end: '',
    startDate: null,
    endDate: null,
    type: [DATE_TYPE_ABSOLUTE, DATE_TYPE_ABSOLUTE],
    isNaturalLanguage: false,
    isInvalid: true,
  };

  if (!trimmed) {
    return invalidResult;
  }

  // (1) Check if text matches a preset label (case insensitive)

  const matchedPreset = presets.find(
    (preset) => preset.label.toLowerCase() === trimmed.toLowerCase()
  );
  if (matchedPreset) {
    return buildTimeRange({
      value: text,
      start: matchedPreset.start,
      end: matchedPreset.end,
      startDate: parseDateStringToDate(matchedPreset.start),
      endDate: parseDateStringToDate(matchedPreset.end, { roundUp: true }),
      type: [dateStringToDateType(matchedPreset.start), dateStringToDateType(matchedPreset.end)],
      isNaturalLanguage: true,
    });
  }

  // (2) Check if it's a single value (no delimiter)

  const delimiterMatch = delimiterPattern ? trimmed.match(delimiterPattern) : null;
  if (!delimiterMatch) {
    // Try natural duration: "last 7 minutes", "today", etc.
    const naturalDuration = getTimeRangeBoundsFromNaturalDuration(trimmed);
    if (naturalDuration) {
      return buildTimeRange({
        value: text,
        start: naturalDuration.start,
        end: naturalDuration.end,
        startDate: parseDateStringToDate(naturalDuration.start),
        endDate: parseDateStringToDate(naturalDuration.end, { roundUp: true }),
        type: [
          dateStringToDateType(naturalDuration.start),
          dateStringToDateType(naturalDuration.end),
        ],
        isNaturalLanguage: true,
      });
    }

    // Try as a single instant (treat as start, with end = now)
    const singleInstant = textInstantToDateString(trimmed);
    if (singleInstant) {
      // future shorthand exception (start = now)
      if (SHORTHAND_REGEX.test(singleInstant) && singleInstant.startsWith('now+')) {
        return buildTimeRange({
          value: text,
          start: 'now',
          end: singleInstant,
          startDate: new Date(), // now
          endDate: parseDateStringToDate(singleInstant),
          type: [DATE_TYPE_NOW, dateStringToDateType(singleInstant)],
          isNaturalLanguage: false,
        });
      }
      return buildTimeRange({
        value: text,
        start: singleInstant,
        end: 'now',
        startDate: parseDateStringToDate(singleInstant),
        endDate: new Date(), // now
        type: [dateStringToDateType(singleInstant), DATE_TYPE_NOW],
        isNaturalLanguage: false,
      });
    }

    return invalidResult;
  }

  // (3) Parse as a range with delimiter

  const startText = delimiterMatch[1].trim();
  const endText = delimiterMatch[2].trim();

  if (!startText || !endText) {
    return invalidResult;
  }

  const start = textInstantToDateString(startText.trim());
  const end = textInstantToDateString(endText.trim());

  if (!start || !end) {
    return invalidResult;
  }

  return buildTimeRange({
    value: text,
    start,
    end,
    startDate: parseDateStringToDate(start),
    endDate: parseDateStringToDate(end, { roundUp: true }),
    type: [dateStringToDateType(start), dateStringToDateType(end)],
    isNaturalLanguage: false,
  });
}

function getTimeRangeBoundsFromNaturalDuration(
  text: string
): { start: DateString; end: DateString } | null {
  const trimmed = text.trim().toLowerCase();

  // Check named ranges first
  if (NAMED_RANGES[trimmed]) {
    return NAMED_RANGES[trimmed];
  }

  // "last 7 minutes" or "next 7 days"
  const match = trimmed.match(NATURAL_DURATION_REGEX);
  if (match) {
    const [, direction, count, unitWord] = match;
    const unit = UNIT_FULL_TO_SHORT_MAP[unitWord.toLowerCase()];
    if (unit) {
      if (direction === 'last') {
        return { start: `now-${count}${unit}`, end: 'now' };
      }
      return { start: 'now', end: `now+${count}${unit}` };
    }
  }

  return null;
}

function textInstantToDateString(text: string): DateString | null {
  const trimmed = text.trim();
  const normalized = trimmed.toLowerCase();

  // "now"
  if (normalized === 'now') {
    return 'now';
  }

  // Shorthand: "-7m", "+7d", "now-7m/d"
  const shorthandMatch = trimmed.match(SHORTHAND_REGEX);
  if (shorthandMatch) {
    const [, , operator, count, unit, round = ''] = shorthandMatch;
    return `now${operator}${count}${unit}${round}`;
  }

  // Natural instant: "7 minutes ago" -> now-7m
  const instantMatch = normalized.match(NATURAL_INSTANT_REGEX);
  if (instantMatch) {
    const [, count, unitWord, direction] = instantMatch;
    const unit = UNIT_FULL_TO_SHORT_MAP[unitWord.toLowerCase()];
    if (unit) {
      const operator = direction === 'ago' ? '-' : '+';
      return `now${operator}${count}${unit}`;
    }
  }

  // Try parsing as absolute date with explicit display formats first
  const parsedWithFormat = moment(trimmed, SUPPORTED_DATE_FORMATS, true);
  if (parsedWithFormat.isValid()) {
    return trimmed; // Return original, it's valid
  }

  // Only try dateMath for strings that could be datemath or ISO
  if (!/^(now|[+-]|\d)/.test(trimmed)) {
    return null;
  }

  // Try parsing as absolute date via dateMath (ISO, RFC 2822, datemath, etc.)
  const parsed = dateMath.parse(trimmed);
  if (parsed?.isValid()) {
    return trimmed; // Return original, it's valid
  }

  return null;
}

/**
 * Parses a DateString to a Date. Uses explicit formats for absolute display
 * strings to avoid moment's deprecated fallback for non-ISO input.
 */
function parseDateStringToDate(
  dateString: DateString,
  options?: { roundUp?: boolean }
): Date | null {
  const parsedWithFormat = moment(dateString, SUPPORTED_DATE_FORMATS, true);
  if (parsedWithFormat.isValid()) {
    return parsedWithFormat.toDate();
  }
  return dateMath.parse(dateString, options)?.toDate() ?? null;
}

/**
 * Determines the type of a date string
 */
function dateStringToDateType(dateString: DateString): DateType {
  if (dateString === 'now') return DATE_TYPE_NOW;
  if (dateString.includes('now')) return DATE_TYPE_RELATIVE;
  return DATE_TYPE_ABSOLUTE;
}
