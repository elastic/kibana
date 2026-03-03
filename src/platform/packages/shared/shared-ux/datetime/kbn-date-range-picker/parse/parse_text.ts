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
import type { CompiledLocale } from './compile_locale';
import { compileParserLocale, escapeRegExp } from './compile_locale';
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
  const { presets = [], delimiter } = options ?? {};

  // (1) Preset label match
  // TODO move this out of the parse function and into the context?
  const preset = matchPreset(trimmed, presets);
  if (preset) {
    return buildRange(text, preset.start, preset.end, compiled.absoluteFormats, true);
  }

  // (2) Named range from locale ("today", "yesterday", "this week", ...)
  const named = locale.namedRanges[trimmed.toLowerCase()];
  if (named) {
    return buildRange(text, named.start, named.end, compiled.absoluteFormats, true);
  }

  // (3) Natural duration ("last 7 minutes", "next 3 days")
  const duration = matchNaturalDuration(trimmed, locale, compiled);
  if (duration) {
    return buildRange(text, duration.start, duration.end, compiled.absoluteFormats, true);
  }

  // (4) Try splitting on delimiters (locale + universal + extra)
  const parts = trySplit(trimmed, locale, delimiter);
  if (parts) {
    const startDateString = instantToDateString(parts[0], locale, compiled);
    const endDateString = instantToDateString(parts[1], locale, compiled);
    if (startDateString && endDateString) {
      return buildRange(text, startDateString, endDateString, compiled.absoluteFormats, false);
    }
    return buildInvalidRange(text);
  }

  // (5) Single instant (no delimiter found)
  const dateString = instantToDateString(trimmed, locale, compiled);
  if (!dateString) return buildInvalidRange(text);

  if (dateString.startsWith('now+')) {
    return buildRange(text, 'now', dateString, compiled.absoluteFormats, false);
  }
  return buildRange(text, dateString, 'now', compiled.absoluteFormats, false);
}

// --- Helpers ---

function buildDelimiterPattern(delimiter: string): RegExp | null {
  const trimmedDelimiter = delimiter.trim();
  return trimmedDelimiter
    ? new RegExp(`^(.+?)\\s+${escapeRegExp(trimmedDelimiter)}\\s+(.+)$`)
    : null;
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
  compiled: CompiledLocale
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
  if (resolveDateString(trimmed, compiled.absoluteFormats) !== null) return trimmed;

  return null;
}

/**
 * Resolves a {@link DateString} to a `Date`, returning `null` if unrecognised.
 *
 * How "forgivingness" is handled per format category:
 *
 * - **ISO 8601** — forgiving. Partial values like `2025-11` work
 *   (via the dateMath / ISO fallback at the end).
 * - **Locale display formats** (including RFC 2822 for English) —
 *   forgiving. Partial values like `Nov` or `Nov 10 2025 12:34` are
 *   accepted as long as the input is not already valid ISO 8601.
 *   This guard prevents ambiguity; without it an ISO date like
 *   `1970-01-01` could be garbled by a non-strict `MMM D, YYYY` parse.
 * - **Unix timestamp** — not forgiving (must be exactly 10 or 13 digits).
 */
function resolveDateString(
  dateString: DateString,
  formats: string[],
  options?: { roundUp?: boolean }
): Date | null {
  const msMatch = dateString.match(/^now([+-])(\d+)ms$/);
  if (msMatch) {
    const offset = (msMatch[1] === '-' ? -1 : 1) * parseInt(msMatch[2], 10);
    return new Date(Date.now() + offset);
  }

  const strict = moment(dateString, formats, true);
  if (strict.isValid()) return strict.toDate();

  // Forgiving: try locale formats with non-strict matching, but only
  // when the input is not valid ISO 8601 (to avoid cross-format ambiguity)
  if (formats.length && !moment(dateString, moment.ISO_8601, true).isValid()) {
    const forgiving = moment(dateString, formats);
    if (forgiving.isValid()) return forgiving.toDate();
  }

  const unixDate = unixTimestampToDate(dateString);
  if (unixDate) return unixDate;

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
    startDate: resolveDateString(start, formats),
    endDate: resolveDateString(end, formats, { roundUp: true }),
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
 * Tries in order: extra delimiter, locale delimiters, universal `-`.
 */
function trySplit(text: string, locale: ParserLocale, extra?: string): [string, string] | null {
  const patterns: RegExp[] = [];

  if (extra) {
    const delimiterPattern = buildDelimiterPattern(extra);
    if (delimiterPattern) patterns.push(delimiterPattern);
  }
  for (const delimiter of locale.delimiters) {
    const delimiterPattern = buildDelimiterPattern(delimiter);
    if (delimiterPattern) patterns.push(delimiterPattern);
  }
  const dashPattern = buildDelimiterPattern('-');
  if (dashPattern) patterns.push(dashPattern);

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1].trim() && match[2].trim()) {
      return [match[1].trim(), match[2].trim()];
    }
  }
  return null;
}

function matchNaturalDuration(
  text: string,
  locale: ParserLocale,
  compiled: CompiledLocale
): { start: DateString; end: DateString } | null {
  for (const template of compiled.durationPast) {
    const match = text.match(template.regex);
    if (match) {
      const unit = resolveUnit(match[template.unitGroup], locale.unitAliases);
      if (unit) return { start: `now-${match[template.countGroup]}${unit}`, end: 'now' };
    }
  }
  for (const template of compiled.durationFuture) {
    const match = text.match(template.regex);
    if (match) {
      const unit = resolveUnit(match[template.unitGroup], locale.unitAliases);
      if (unit) return { start: 'now', end: `now+${match[template.countGroup]}${unit}` };
    }
  }
  return null;
}

function matchNaturalInstant(
  text: string,
  locale: ParserLocale,
  compiled: CompiledLocale
): DateString | null {
  for (const template of compiled.instantPast) {
    const match = text.match(template.regex);
    if (match) {
      const unit = resolveUnit(match[template.unitGroup], locale.unitAliases);
      if (unit) return `now-${match[template.countGroup]}${unit}`;
    }
  }
  for (const template of compiled.instantFuture) {
    const match = text.match(template.regex);
    if (match) {
      const unit = resolveUnit(match[template.unitGroup], locale.unitAliases);
      if (unit) return `now+${match[template.countGroup]}${unit}`;
    }
  }
  return null;
}
