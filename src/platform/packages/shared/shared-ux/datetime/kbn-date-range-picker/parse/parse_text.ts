/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dateMath from '@elastic/datemath';
import { i18n } from '@kbn/i18n';
import moment from 'moment';

import {
  DATE_TYPE_ABSOLUTE,
  DATE_TYPE_NOW,
  DATE_TYPE_RELATIVE,
  ROUND_UNIT_MAP,
} from '../constants';
import type {
  DateType,
  DateString,
  DateOffset,
  TimeUnit,
  TimeRange,
  TimeRangeTransformOptions,
  TimeRangeBoundsOption,
} from '../types';
import { isValidTimeRange } from '../utils';
import {
  ENGLISH_GRAMMAR,
  findDelimiterSplits,
  getCompiledGrammar,
  resolveUnit,
  type CompiledGrammar,
  type CompiledTemplate,
} from './locale_grammar';

// ---------------------------------------------------------------------------
// Absolute-date formats — deliberately locale-invariant (localized absolute-
// date parsing is a deferred phase; see the i18n plan doc).
// ---------------------------------------------------------------------------

const ABSOLUTE_FORMATS: string[] = [
  // Canonical Kibana (with @ separator)
  'MMM D, YYYY @ HH:mm:ss.SSS',
  'MMM D, YYYY @ HH:mm:ss',
  'MMM D, YYYY @ HH:mm',
  'MMM D, YYYY @ HH',

  // DateRangePicker default (milliseconds → minutes, with and without comma after day)
  'MMM D, YYYY, HH:mm:ss.SSS',
  'MMM D YYYY, HH:mm:ss.SSS',
  'MMM D, YYYY, HH:mm:ss',
  'MMM D YYYY, HH:mm:ss',
  'MMM D, YYYY, HH:mm',
  'MMM D YYYY, HH:mm',
  'MMM D, YYYY',
  'MMM D YYYY',
  'MMM D, HH:mm',
  'MMM D',

  // ISO 8601 date with simple time
  'YYYY-MM-DD H:mm',

  // US-style (M/D handles 1- and 2-digit month/day)
  'M/D/YYYY H:mm',
  'M/D H:mm',
  'M/D/YYYY',
  'M/D',

  // RFC 2822 (with/without day-of-week, with/without seconds, with/without numeric offset)
  'ddd, DD MMM YYYY HH:mm:ss ZZ',
  'ddd, DD MMM YYYY HH:mm ZZ',
  'DD MMM YYYY HH:mm:ss ZZ',
  'DD MMM YYYY HH:mm ZZ',
  'ddd, DD MMM YYYY HH:mm:ss',
  'ddd, DD MMM YYYY HH:mm',
  'DD MMM YYYY HH:mm:ss',
  'DD MMM YYYY HH:mm',
];

/**
 * Builds a reverse map from `"start|end"` bounds keys to the shortest alias
 * that resolves to those bounds. When multiple aliases point to the same
 * canonical named range, the shortest one wins. English-only — aliases like
 * `td`/`yd`/`tmr` are English mnemonics; locales don't define their own
 * unless one clearly wants them (none do today).
 */
function buildBoundsToAliasMap(): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const [alias, canonical] of Object.entries(ENGLISH_GRAMMAR.namedRangeAliases)) {
    const range = ENGLISH_GRAMMAR.namedRanges[canonical];
    if (!range) continue;
    const key = `${range.start}|${range.end}`;
    const existing = map.get(key);
    if (!existing || alias.length < existing.length) {
      map.set(key, alias);
    }
  }
  return map;
}

const boundsToAlias = buildBoundsToAliasMap();

/**
 * Returns the shorthand alias for a named range identified by its bounds,
 * or `null` if no alias exists.
 *
 * @example
 * getNamedRangeAlias('now/d', 'now/d')       // "td"
 * getNamedRangeAlias('now-1d/d', 'now-1d/d') // "yd"
 * getNamedRangeAlias('now-15m', 'now')        // null
 */
export function getNamedRangeAlias(start: string, end: string): string | null {
  return boundsToAlias.get(`${start}|${end}`) ?? null;
}

/**
 * Resolves a named range alias to its canonical name, or returns the
 * input unchanged if it is not an alias. English-only — see
 * {@link buildBoundsToAliasMap}.
 *
 * @example
 * resolveNamedRangeAlias('td')    // "today"
 * resolveNamedRangeAlias('yd')    // "yesterday"
 * resolveNamedRangeAlias('today') // "today"
 */
export function resolveNamedRangeAlias(text: string): string {
  return ENGLISH_GRAMMAR.namedRangeAliases[text.toLowerCase()] ?? text;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

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
 * Supports presets, named ranges, natural durations/instants, shorthand
 * datemath, unix timestamps, and absolute dates. Named ranges, durations,
 * instants, and delimiters are matched against `options.locale` merged with
 * English, so English is always parseable alongside whichever locale is
 * active. Shorthand datemath, unix timestamps, and absolute dates are
 * locale-invariant.
 */
export function textToTimeRange(text: string, options?: TimeRangeTransformOptions): TimeRange {
  const trimmed = text.trim();
  if (!trimmed) return buildInvalidRange(text);

  const { presets = [], delimiter, dateFormat, roundRelativeTime, locale } = options ?? {};
  const compiled = getCompiledGrammar(locale ?? i18n.getLocale());
  const formats = dateFormat ? [dateFormat, ...ABSOLUTE_FORMATS] : ABSOLUTE_FORMATS;

  // (1) Preset label match
  const preset = matchPreset(trimmed, presets);
  if (preset) {
    const roundedStart = applyStartBoundRounding(preset.start, roundRelativeTime);
    return buildRange(text, roundedStart, preset.end, formats, true);
  }

  // (2) Named range ("today", "yesterday", "this week", ...) or alias ("td", "yd", "tmr")
  const lower = trimmed.toLowerCase();
  const canonicalKey = compiled.namedRangeAliases[lower] ?? lower;
  const named = compiled.namedRanges[canonicalKey];
  if (named) {
    return buildRange(text, named.start, named.end, formats, true);
  }

  // (3) Natural duration ("last 7 minutes", "next 3 days")
  const duration = matchNaturalDuration(trimmed, compiled);
  if (duration) {
    const roundedStart = applyStartBoundRounding(duration.start, roundRelativeTime);
    return buildRange(text, roundedStart, duration.end, formats, true);
  }

  // (4) Try splitting on delimiters (extra + locale grammar + universal dash).
  // Every occurrence of every delimiter is a CANDIDATE, accepted only when
  // both sides parse — a delimiter word may equally appear inside a phrase
  // (French "il y a 3 jours" contains the accent-less delimiter "a"), in which
  // case the wrong occurrences fail side-parsing and the right one (or the
  // whole-text instant path below) wins.
  const splitDelimiters = [...(delimiter ? [delimiter] : []), ...compiled.delimiters, '-'];
  for (const splitDelimiter of splitDelimiters) {
    for (const candidate of findDelimiterSplits(trimmed, splitDelimiter)) {
      const startDateString = instantToDateString(candidate.left, compiled, formats);
      const endDateString = instantToDateString(candidate.right, compiled, formats);
      if (startDateString && endDateString) {
        const roundedStart = applyStartBoundRounding(startDateString, roundRelativeTime);
        return buildRange(text, roundedStart, endDateString, formats, false);
      }
    }
  }

  // (5) Single instant (no delimiter candidate produced two parseable sides)
  const dateString = instantToDateString(trimmed, compiled, formats);
  if (!dateString) return buildInvalidRange(text);

  if (dateString.startsWith('now+')) {
    return buildRange(text, 'now', dateString, formats, false);
  }
  const roundedStart = applyStartBoundRounding(dateString, roundRelativeTime);
  return buildRange(text, roundedStart, 'now', formats, false);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

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
 * Applies or strips the rounding suffix on a relative datemath `start` string.
 *
 * - `true` — keeps existing rounding; when absent, appends `/{roundUnit}`
 *   inferred from the offset unit via {@link ROUND_UNIT_MAP}.
 * - `false` — removes any trailing rounding suffix.
 * - `undefined` — returns the string unchanged.
 *
 * Bare `'now'` and non-relative strings are always returned as-is.
 */
function applyStartBoundRounding(
  start: DateString,
  roundRelativeTime: boolean | undefined
): DateString {
  if (roundRelativeTime === undefined) return start;
  if (start === 'now' || !start.includes('now')) return start;

  const offset = dateStringToOffset(start);
  if (!offset) return start;

  if (roundRelativeTime === false) {
    return start.replace(/\/[smhdwMy]$/, '');
  }

  if (offset.roundTo) return start;

  const roundUnit = ROUND_UNIT_MAP[offset.unit];
  if (!roundUnit) return start;

  return `${start}/${roundUnit}`;
}

/**
 * Converts a single text fragment into a {@link DateString}.
 * Tries (in order): "now", shorthand, natural instant, unix timestamp,
 * absolute formats, and finally dateMath/ISO fallback.
 */
function instantToDateString(
  text: string,
  compiled: CompiledGrammar,
  formats: string[]
): DateString | null {
  const trimmed = text.trim();

  if (compiled.nowKeywords.includes(trimmed.toLowerCase())) return 'now';

  // Shorthand: "7d", "-7d", "+7d", "now-7d/d", "500ms"
  const shorthandMatch = trimmed.match(compiled.shorthandRegex);
  if (shorthandMatch) {
    const unit = resolveUnit(shorthandMatch[4], compiled.unitAliases);
    if (unit) {
      const operator = shorthandMatch[2] === '+' ? '+' : '-';
      return `now${operator}${shorthandMatch[3]}${unit}${shorthandMatch[5] ?? ''}`;
    }
  }

  // Natural instant: "7 minutes ago", "in 7 minutes"
  const instant = matchNaturalInstant(trimmed, compiled);
  if (instant) return instant;

  const unixDate = unixTimestampToDate(trimmed);
  if (unixDate) return unixDate.toISOString();

  // DateMath with rounding only (e.g. "now/d", "now/w") — preserve as-is.
  // These aren't caught by the shorthand regex which expects a count.
  if (/^now\/[smhdwMy]$/.test(trimmed)) return trimmed;

  // Natural-language vocabulary (a unit word, direction word, or instant
  // marker) that reached this point is a failed PHRASE, not an absolute
  // date — reject it rather than let the forgiving absolute-date fallback
  // misread it ("5 minutes to spare" would otherwise parse as May 1).
  if (containsGrammarVocabulary(trimmed, compiled)) return null;

  // Absolute date / ISO fallback — normalize to ISO so that
  // timeRange.start/end and onChange always emit ISO or dateMath strings.
  const absoluteDate = dateStringToDate(trimmed, formats);
  if (absoluteDate !== null) return absoluteDate.toISOString();

  return null;
}

/** True when any standalone word of `text` is part of the grammar's natural language. */
function containsGrammarVocabulary(text: string, compiled: CompiledGrammar): boolean {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .some((word) => word !== '' && compiled.vocabulary.has(word));
}

/**
 * Converts a {@link DateString} to a `Date`, returning `null` if unrecognised.
 *
 * Handles absolute formats (strict then forgiving), ISO 8601, and datemath.
 * Unix timestamps are handled upstream by `instantToDateString` before this is called.
 */
function dateStringToDate(
  dateString: DateString,
  formats: string[],
  options?: { roundUp?: boolean; forceNow?: Date }
): Date | null {
  const strict = moment(dateString, formats, true);
  if (strict.isValid()) return strict.toDate();

  // Resolve ISO dates and datemath expressions before forgiving mode, which
  // can produce false positives with short formats like M/D.
  const isIsoDate = /^\d{4}-\d{2}-\d{2}(T|\s+\d|$)/.test(dateString);
  const isDateMath = dateString === 'now' || /^now[/|+-]/.test(dateString);
  if (isIsoDate || isDateMath) {
    const parsed = dateMath.parse(dateString, options);
    return parsed?.isValid() ? parsed.toDate() : null;
  }

  if (formats.length) {
    const forgiving = moment(dateString, formats);
    if (forgiving.isValid()) return forgiving.toDate();
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
  // Anchor both bounds to the same instant
  const forceNow = new Date();
  const range: TimeRange = {
    value: text,
    start,
    end,
    startDate: dateStringToDate(start, formats, { forceNow }),
    endDate: dateStringToDate(end, formats, { roundUp: true, forceNow }),
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

/** Tries each compiled template against the text, returning the first successful match or `null`. */
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
  compiled: CompiledGrammar
): { start: DateString; end: DateString } | null {
  const past = matchTemplates(
    text,
    compiled.durationPast,
    compiled.unitAliases,
    (count, unit) => `now-${count}${unit}`
  );
  if (past) return { start: past, end: 'now' };

  const future = matchTemplates(
    text,
    compiled.durationFuture,
    compiled.unitAliases,
    (count, unit) => `now+${count}${unit}`
  );
  if (future) return { start: 'now', end: future };

  return null;
}

function matchNaturalInstant(text: string, compiled: CompiledGrammar): DateString | null {
  return (
    matchTemplates(
      text,
      compiled.instantPast,
      compiled.unitAliases,
      (count, unit) => `now-${count}${unit}`
    ) ??
    matchTemplates(
      text,
      compiled.instantFuture,
      compiled.unitAliases,
      (count, unit) => `now+${count}${unit}`
    )
  );
}
