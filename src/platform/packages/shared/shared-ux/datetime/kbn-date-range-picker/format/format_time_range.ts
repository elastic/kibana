/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment';

import {
  ENGLISH_GRAMMAR,
  getActiveGrammar,
  matchPreset,
  resolveNamedRangeAlias,
  type LocaleGrammar,
} from '../parse';
import {
  CHAINED_DATE_MATH_RE,
  DATE_RANGE_DISPLAY_DELIMITER,
  DEFAULT_DATE_FORMAT,
  DEFAULT_DATE_FORMAT_NO_YEAR,
  DEFAULT_DATE_FORMAT_TIME_ONLY,
  DATE_TYPE_ABSOLUTE,
  DATE_TYPE_NOW,
  DATE_TYPE_RELATIVE,
} from '../constants';
import type { TimePrecision, TimeRange, TimeRangeFormatOptions, TimeUnit } from '../types';

/**
 * Trims a moment format string to the requested sub-minute precision.
 * - `'ms'`  — keep everything (seconds + milliseconds).
 * - `'s'`   — strip `.SSS`.
 * - `'none'`— strip `:ss.SSS` (and `:ss`).
 */
export function applyTimePrecision(format: string, precision: TimePrecision = 's'): string {
  if (precision === 'ms') return format;
  if (precision === 's') return format.replace(/[.,]SSS/g, '');
  // 'none' — strip seconds (and any trailing milliseconds)
  return format.replace(/:ss[.,]SSS/g, '').replace(/:ss/g, '');
}

/**
 * Converts a parsed TimeRange into a human-readable display string.
 * Absolute dates always use the picker's own format, never a consumer's input format.
 */
export function timeRangeToDisplayText(
  timeRange: TimeRange,
  options?: TimeRangeFormatOptions
): string {
  const {
    delimiter = DATE_RANGE_DISPLAY_DELIMITER,
    timePrecision = 's',
    locale,
    presets = [],
  } = options ?? {};
  const grammar = getActiveGrammar(locale ?? i18n.getLocale());

  if (timeRange.isInvalid) {
    return timeRange.value;
  }
  if (timeRange.isNaturalLanguage) {
    // Text that matched a preset label shows the label as configured, not as typed
    const preset = matchPreset(timeRange.value, presets);
    if (preset?.label) return preset.label;

    // Resolve aliases (e.g. "yd" → "yesterday") before capitalizing
    const resolved = resolveNamedRangeAlias(timeRange.value);
    return resolved.charAt(0).toUpperCase() + resolved.slice(1);
  }

  // For [RELATIVE, NOW] show "Last {count} {unit}" and for [NOW, RELATIVE] show "Next {count} {unit}"
  const [startType, endType] = timeRange.type;
  if (startType === DATE_TYPE_RELATIVE && endType === DATE_TYPE_NOW) {
    const parts = dateMathToRelativeParts(timeRange.start);
    if (parts) {
      return formatCompactRelativeTime(parts.count, parts.unit, false, grammar);
    }
  }
  if (startType === DATE_TYPE_NOW && endType === DATE_TYPE_RELATIVE) {
    const parts = dateMathToRelativeParts(timeRange.end);
    if (parts) {
      return formatCompactRelativeTime(parts.count, parts.unit, true, grammar);
    }
  }

  let startDateFormat: string = DEFAULT_DATE_FORMAT;
  let endDateFormat: string = DEFAULT_DATE_FORMAT;

  // Abbreviate absolute dates a little
  if (timeRange.type.includes(DATE_TYPE_ABSOLUTE)) {
    const currentYear = new Date().getFullYear();
    const startYear = timeRange.startDate?.getFullYear();
    const endYear = timeRange.endDate?.getFullYear();
    const startIsNow = timeRange.type[0] === DATE_TYPE_NOW;
    const endIsNow = timeRange.type[1] === DATE_TYPE_NOW;

    // Hide year if both dates are in the current year, or one part is "now"
    const startInCurrentYear = startIsNow || startYear === currentYear;
    const endInCurrentYear = endIsNow || endYear === currentYear;
    if (startInCurrentYear && endInCurrentYear) {
      startDateFormat = DEFAULT_DATE_FORMAT_NO_YEAR;
      endDateFormat = DEFAULT_DATE_FORMAT_NO_YEAR;
    }

    // Show only time for end date if both dates are on the same day
    if (
      timeRange.startDate &&
      timeRange.endDate &&
      timeRange.startDate.toDateString() === timeRange.endDate.toDateString()
    ) {
      endDateFormat = DEFAULT_DATE_FORMAT_TIME_ONLY;
    }
  }

  const startDisplay = formatDateInstant(
    timeRange.start,
    timeRange.startDate,
    applyTimePrecision(startDateFormat, timePrecision),
    grammar
  );
  const endDisplay = formatDateInstant(
    timeRange.end,
    timeRange.endDate,
    applyTimePrecision(endDateFormat, timePrecision),
    grammar
  );

  return `${startDisplay} ${delimiter.trim()} ${endDisplay}`;
}

/**
 * Converts a parsed TimeRange into a fully formatted date string,
 * always rendering both start and end as absolute dates in the given format.
 */
export function timeRangeToFullFormattedText(
  timeRange: TimeRange,
  options?: TimeRangeFormatOptions
): string {
  const { delimiter = DATE_RANGE_DISPLAY_DELIMITER, timePrecision = 'ms' } = options ?? {};

  if (timeRange.isInvalid) {
    return timeRange.value;
  }

  const format = applyTimePrecision(DEFAULT_DATE_FORMAT, timePrecision);
  const formattedStart = timeRange.startDate
    ? formatAbsoluteInstant(timeRange.startDate, format)
    : timeRange.start;
  const formattedEnd = timeRange.endDate
    ? formatAbsoluteInstant(timeRange.endDate, format)
    : timeRange.end;

  return `${formattedStart} ${delimiter.trim()} ${formattedEnd}`;
}

/**
 * Formats a single date instant for display.
 * Converts date math to natural language where possible.
 */
function formatDateInstant(
  dateString: string,
  date: Date | null,
  dateFormat: string,
  grammar: LocaleGrammar
): string {
  if (dateString === 'now') {
    return grammar.nowKeyword;
  }

  // Try to parse as relative date math: now-7m, now+3d, etc.
  const relativeParts = dateMathToRelativeParts(dateString);
  if (relativeParts) {
    return formatRelativeTime(
      relativeParts.count,
      relativeParts.unit,
      relativeParts.isFuture,
      grammar
    );
  }

  if (isChainedDateMath(dateString)) {
    return dateString;
  }

  // For absolute dates, format using the date object
  if (date) {
    return formatAbsoluteInstant(date, dateFormat);
  }

  // Fallback: return original string
  return dateString;
}

/** True for chained date math like `now/y+3M`; not simple offsets or `now/d`. */
function isChainedDateMath(value: string): boolean {
  if (!value.startsWith('now') || !CHAINED_DATE_MATH_RE.test(value)) return false;
  if (dateMathToRelativeParts(value)) return false;
  return !/^now\/(?:ms|[smhdwMy])$/.test(value);
}

/**
 * Parses date math like "now-7m" or "now+3d/d" into parts.
 * Returns `null` for values that are not relative date math (absolute dates, bare `now`, rounding-only).
 */
export function dateMathToRelativeParts(
  value: string
): { count: number; unit: string; isFuture: boolean; round?: string } | null {
  const match = value.match(/^now([+-])(\d+)(ms|[smhdwMy])(\/[smhdwMy])?$/);
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

/** Fills a `"{count} {unit}"`-shaped template with the resolved unit word. */
function fillTemplate(template: string, count: number, unitWord: string): string {
  return template.replace('{count}', String(count)).replace('{unit}', unitWord);
}

const pluralityOf = (count: number): 'singular' | 'plural' => (count === 1 ? 'singular' : 'plural');

/**
 * Resolves the unit word for `unit`/`count` in `grammar`, falling back to
 * English, and to the raw `unit` string when it is not a known unit at all.
 */
function resolveUnitWord(unit: string, count: number, grammar: LocaleGrammar): string {
  const words: LocaleGrammar['unitWords'][TimeUnit] | undefined =
    grammar.unitWords[unit as TimeUnit] ?? ENGLISH_GRAMMAR.unitWords[unit as TimeUnit];
  return words ? words[pluralityOf(count)] : unit;
}

/**
 * Formats relative time as natural language, generated from the active
 * grammar's own instant templates — never hand-built English — so whatever
 * is displayed is guaranteed re-parseable. The unit word honors the grammar's
 * `generation.instantUnitWords` agreement overrides (e.g. German dative
 * "vor 15 Tagen", not "vor 15 Tage").
 * e.g., (7, 'm', false) => "7 minutes ago"
 * e.g., (3, 'd', true) => "3 days from now"
 */
function formatRelativeTime(
  count: number,
  unit: string,
  isFuture: boolean,
  grammar: LocaleGrammar
): string {
  const unitWord =
    grammar.generation?.instantUnitWords?.[unit as TimeUnit]?.[pluralityOf(count)] ??
    resolveUnitWord(unit, count, grammar);
  const template = (isFuture ? grammar.instantTemplates.future : grammar.instantTemplates.past)[0];
  return fillTemplate(template, count, unitWord);
}

/**
 * Formats a compact relative time label, generated from the active grammar's
 * own duration templates. The template honors the grammar's per-unit
 * `generation` agreement overrides (e.g. French feminine "Dernières 15
 * minutes", German masculine singular "Letzter 1 Tag") before falling back to
 * the first duration template. The result is capitalized as a UI label
 * (matching the same sentence-initial capitalization already applied to named
 * ranges).
 * e.g., (7, 'm', false) => "Last 7 minutes"
 * e.g., (3, 'd', true) => "Next 3 days"
 */
function formatCompactRelativeTime(
  count: number,
  unit: string,
  isFuture: boolean,
  grammar: LocaleGrammar
): string {
  const unitWord = resolveUnitWord(unit, count, grammar);
  const overrides = isFuture
    ? grammar.generation?.durationFuture
    : grammar.generation?.durationPast;
  const template =
    overrides?.[unit as TimeUnit]?.[pluralityOf(count)] ??
    (isFuture ? grammar.durationTemplates.future : grammar.durationTemplates.past)[0];
  const phrase = fillTemplate(template, count, unitWord);
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

/**
 * Formats an absolute date for display using a moment format string.
 */
function formatAbsoluteInstant(date: Date, dateFormat: string): string {
  return moment(date).format(dateFormat);
}
