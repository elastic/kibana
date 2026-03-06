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

import { DATE_TYPE_ABSOLUTE, DATE_TYPE_NOW, DATE_TYPE_RELATIVE } from '../constants';
import type {
  DateType,
  DateString,
  DateOffset,
  TimeUnit,
  TimeRange,
  TimeRangeTransformOptions,
  TimeRangeBoundsOption,
  ParserLocale,
} from '../types';
import { isValidTimeRange } from '../utils';
import type { CompiledLocale, CompiledTemplate } from './compile_locale';
import { compileParserLocale, buildDelimiterPattern } from './compile_locale';
import { en } from './locales/en';

/** Matches text against preset labels (case-insensitive). */
export function matchPreset(
  text: string,
  presets: TimeRangeBoundsOption[]
): TimeRangeBoundsOption | undefined {
  const lower = text.trim().toLowerCase();
  return presets.find((preset) => preset.label?.toLowerCase() === lower);
}

/**
 * Parses free-form text into a structured {@link TimeRange}.
 *
 * Supports presets, named ranges, natural durations/instants,
 * shorthand datemath, unix timestamps, and absolute dates.
 * Vocabulary comes from the locale (defaults to English).
 */
export function textToTimeRange(text: string, options?: TimeRangeTransformOptions): TimeRange {
  const trimmed = text.trim();
  if (!trimmed) return buildInvalidRange(text);

  const locale = options?.locale ?? en;
  const compiled = compileParserLocale(locale);
  const { presets = [], delimiter, dateFormat } = options ?? {};
  const formats = dateFormat ? [dateFormat, ...compiled.absoluteFormats] : compiled.absoluteFormats;

  // (1) Preset label match
  // TODO move this out of the parse function?
  const preset = matchPreset(trimmed, presets);
  if (preset) {
    return buildRange(text, preset.start, preset.end, formats, true);
  }

  // (2) Named range from locale ("today", "yesterday", "this week", ...)
  const named = locale.namedRanges[trimmed.toLowerCase()];
  if (named) {
    return buildRange(text, named.start, named.end, formats, true);
  }

  // (3) Natural duration ("last 7 minutes", "next 3 days")
  const duration = matchNaturalDuration(trimmed, locale, compiled);
  if (duration) {
    return buildRange(text, duration.start, duration.end, formats, true);
  }

  // (4) Try splitting on delimiters (locale + universal + extra)
  const parts = trySplit(trimmed, compiled, delimiter);
  if (parts) {
    const startDateString = instantToDateString(parts[0], locale, compiled, formats);
    const endDateString = instantToDateString(parts[1], locale, compiled, formats);
    if (startDateString && endDateString) {
      return buildRange(text, startDateString, endDateString, formats, false);
    }
    return buildInvalidRange(text);
  }

  // (5) Single instant (no delimiter found)
  const dateString = instantToDateString(trimmed, locale, compiled, formats);
  if (!dateString) return buildInvalidRange(text);

  if (dateString.startsWith('now+')) {
    return buildRange(text, 'now', dateString, formats, false);
  }
  return buildRange(text, dateString, 'now', formats, false);
}

/** Resolves a user-typed unit string through locale aliases (exact first, then lowercase). */
function resolveUnit(text: string, aliases: Record<string, TimeUnit>): TimeUnit | null {
  return aliases[text] ?? aliases[text.toLowerCase()] ?? null;
}

/** Parses a unix timestamp string (10-digit seconds or 13-digit milliseconds) to a `Date`. */
function unixTimestampToDate(text: string): Date | null {
  if (/^\d{10}$/.test(text)) return new Date(parseInt(text, 10) * 1000);
  if (/^\d{13}$/.test(text)) return new Date(parseInt(text, 10));
  return null;
}

function dateStringToType(dateString: DateString): DateType {
  if (dateString === 'now') return DATE_TYPE_NOW;
  if (dateString.includes('now')) return DATE_TYPE_RELATIVE;
  return DATE_TYPE_ABSOLUTE;
}

/** Extracts a structured {@link DateOffset} from a datemath string like `now-7d/d`. */
function dateStringToOffset(dateString: DateString): DateOffset | null {
  const match = dateString.match(/^now([+-])(\d+)([a-zA-Z]+)(?:\/([smhdwMy]))?$/);
  if (!match) return null;
  const [, operator, digits, unit, roundUnit] = match;
  return {
    count: operator === '-' ? -parseInt(digits, 10) : parseInt(digits, 10),
    unit: unit as TimeUnit,
    ...(roundUnit ? { roundTo: roundUnit as TimeUnit } : {}),
  };
}

/**
 * Converts a single text fragment into a {@link DateString}.
 * Tries (in order): "now", shorthand, natural instant, unix timestamp,
 * locale absolute formats, and finally dateMath/ISO fallback.
 */
function instantToDateString(
  text: string,
  locale: ParserLocale,
  compiled: CompiledLocale,
  formats: string[]
): DateString | null {
  const trimmed = text.trim();

  if (trimmed.toLowerCase() === locale.now) return 'now';

  // Shorthand: "7d", "-7d", "+7d", "now-7d/d", "500ms"
  const shorthandMatch = trimmed.match(compiled.shorthandRegex);
  if (shorthandMatch) {
    const unit = resolveUnit(shorthandMatch[4], locale.unitAliases);
    if (unit) {
      const operator = shorthandMatch[2] === '+' ? '+' : '-';
      return `now${operator}${shorthandMatch[3]}${unit}${shorthandMatch[5] ?? ''}`;
    }
  }

  // Natural instant: "7 minutes ago", "in 7 minutes"
  const instant = matchNaturalInstant(trimmed, locale, compiled);
  if (instant) return instant;

  const unixDate = unixTimestampToDate(trimmed);
  if (unixDate) return unixDate.toISOString();

  // Absolute date / dateMath / ISO fallback
  if (dateStringToDate(trimmed, formats) !== null) return trimmed;

  return null;
}

/**
 * Converts a {@link DateString} to a `Date`, returning `null` if unrecognised.
 *
 * Handles locale absolute formats (strict then forgiving), ISO 8601, and datemath.
 * Unix timestamps are handled upstream by `instantToDateString` before this is called.
 *
 * Note: dateMath.parse supports milliseconds although it seems undocumented.
 */
function dateStringToDate(
  dateString: DateString,
  formats: string[],
  options?: { roundUp?: boolean }
): Date | null {
  const strict = moment(dateString, formats, true);
  if (strict.isValid()) return strict.toDate();

  // Try locale formats with non-strict matching, but only
  // when the input is not valid ISO 8601 (to avoid cross-format ambiguity)
  if (formats.length && !moment(dateString, moment.ISO_8601, true).isValid()) {
    const forgiving = moment(dateString, formats);
    if (forgiving.isValid()) return forgiving.toDate();
  }

  if (/^(now|[+-]|\d)/.test(dateString)) {
    return dateMath.parse(dateString, options)?.toDate() ?? null;
  }

  return null;
}

/**
 * Builds a complete {@link TimeRange} from start/end datemath strings,
 * resolving dates, types, and offsets automatically.
 */
function buildRange(
  text: string,
  start: DateString,
  end: DateString,
  formats: string[],
  isNaturalLanguage: boolean
): TimeRange {
  const startType = dateStringToType(start);
  const endType = dateStringToType(end);
  const range: TimeRange = {
    value: text,
    start,
    end,
    startDate: dateStringToDate(start, formats),
    endDate: dateStringToDate(end, formats, { roundUp: true }),
    type: [startType, endType],
    isNaturalLanguage,
    startOffset: startType === DATE_TYPE_RELATIVE ? dateStringToOffset(start) : null,
    endOffset: endType === DATE_TYPE_RELATIVE ? dateStringToOffset(end) : null,
    isInvalid: true,
  };
  range.isInvalid = !isValidTimeRange(range);
  return range;
}

function buildInvalidRange(text: string): TimeRange {
  return {
    value: text,
    start: '',
    end: '',
    startDate: null,
    endDate: null,
    type: [DATE_TYPE_ABSOLUTE, DATE_TYPE_ABSOLUTE],
    isNaturalLanguage: false,
    isInvalid: true,
    startOffset: null,
    endOffset: null,
  };
}

/**
 * Attempts to split text into two parts using available delimiters.
 * Tries in order: extra delimiter, then precompiled locale + universal patterns.
 */
function trySplit(text: string, compiled: CompiledLocale, extra?: string): [string, string] | null {
  const patterns = extra
    ? [buildDelimiterPattern(extra), ...compiled.delimiterPatterns].filter(
        (p): p is RegExp => p !== null
      )
    : compiled.delimiterPatterns;

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1].trim() && match[2].trim()) {
      return [match[1].trim(), match[2].trim()];
    }
  }
  return null;
}

/** Tries each compiled template against the text, returning the first successful build or `null`. */
function matchTemplates(
  text: string,
  templates: CompiledTemplate[],
  aliases: Record<string, TimeUnit>,
  buildResult: (count: string, unit: TimeUnit) => string
): string | null {
  for (const t of templates) {
    const match = text.match(t.regex);
    if (match) {
      const unit = resolveUnit(match[t.unitGroup], aliases);
      if (unit) return buildResult(match[t.countGroup], unit);
    }
  }
  return null;
}

function matchNaturalDuration(
  text: string,
  locale: ParserLocale,
  compiled: CompiledLocale
): { start: DateString; end: DateString } | null {
  const past = matchTemplates(
    text,
    compiled.durationPast,
    locale.unitAliases,
    (count, unit) => `now-${count}${unit}`
  );
  if (past) return { start: past, end: 'now' };

  const future = matchTemplates(
    text,
    compiled.durationFuture,
    locale.unitAliases,
    (count, unit) => `now+${count}${unit}`
  );
  if (future) return { start: 'now', end: future };

  return null;
}

function matchNaturalInstant(
  text: string,
  locale: ParserLocale,
  compiled: CompiledLocale
): DateString | null {
  return (
    matchTemplates(
      text,
      compiled.instantPast,
      locale.unitAliases,
      (count, unit) => `now-${count}${unit}`
    ) ??
    matchTemplates(
      text,
      compiled.instantFuture,
      locale.unitAliases,
      (count, unit) => `now+${count}${unit}`
    )
  );
}
