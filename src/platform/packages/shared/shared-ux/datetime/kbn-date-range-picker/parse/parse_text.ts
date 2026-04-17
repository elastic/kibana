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

// ---------------------------------------------------------------------------
// Parser config (English-only, not exposed to consumers)
// ---------------------------------------------------------------------------

interface ParserConfig {
  nowKeyword: string;
  delimiters: string[];
  namedRanges: Record<string, { start: string; end: string }>;
  /** Maps shorthand aliases to canonical named range keys (e.g. `td` → `today`). */
  namedRangeAliases: Record<string, string>;
  unitAliases: Record<string, TimeUnit>;
  durationTemplates: { past: string[]; future: string[] };
  instantTemplates: { past: string[]; future: string[] };
  absoluteFormats: string[];
}

const DEFAULT_CONFIG: ParserConfig = {
  nowKeyword: 'now',
  delimiters: ['to', 'until'],
  namedRanges: {
    today: { start: 'now/d', end: 'now/d' },
    yesterday: { start: 'now-1d/d', end: 'now-1d/d' },
    tomorrow: { start: 'now+1d/d', end: 'now+1d/d' },
    'this week': { start: 'now/w', end: 'now/w' },
    'this month': { start: 'now/M', end: 'now/M' },
    'this year': { start: 'now/y', end: 'now/y' },
    'last week': { start: 'now-1w/w', end: 'now-1w/w' },
    'last month': { start: 'now-1M/M', end: 'now-1M/M' },
    'last year': { start: 'now-1y/y', end: 'now-1y/y' },
  },
  namedRangeAliases: {
    td: 'today',
    yd: 'yesterday',
    tmr: 'tomorrow',
  },
  unitAliases: {
    ms: 'ms',
    s: 's',
    m: 'm',
    h: 'h',
    d: 'd',
    w: 'w',
    M: 'M',
    y: 'y',
    millisecond: 'ms',
    milliseconds: 'ms',
    second: 's',
    seconds: 's',
    sec: 's',
    secs: 's',
    minute: 'm',
    minutes: 'm',
    min: 'm',
    mins: 'm',
    hour: 'h',
    hours: 'h',
    hr: 'h',
    hrs: 'h',
    day: 'd',
    days: 'd',
    week: 'w',
    weeks: 'w',
    wk: 'w',
    wks: 'w',
    month: 'M',
    months: 'M',
    mo: 'M',
    mos: 'M',
    year: 'y',
    years: 'y',
    yr: 'y',
    yrs: 'y',
  },
  durationTemplates: {
    past: ['last {count} {unit}', 'past {count} {unit}'],
    future: ['next {count} {unit}'],
  },
  instantTemplates: {
    past: ['{count} {unit} ago'],
    future: ['{count} {unit} from now', 'in {count} {unit}'],
  },
  absoluteFormats: [
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
  ],
};

// ---------------------------------------------------------------------------
// Compiled config (cached by object identity)
// ---------------------------------------------------------------------------

interface CompiledTemplate {
  regex: RegExp;
  countGroup: number;
  unitGroup: number;
}

interface CompiledConfig {
  shorthandRegex: RegExp;
  durationPast: CompiledTemplate[];
  durationFuture: CompiledTemplate[];
  instantPast: CompiledTemplate[];
  instantFuture: CompiledTemplate[];
  absoluteFormats: string[];
  delimiterPatterns: RegExp[];
}

const configCache = new WeakMap<ParserConfig, CompiledConfig>();

const escapeRegExp = (input: string) => input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The word delimiters recognised by the parser (excluding the universal dash). */
export const PARSER_DELIMITERS: readonly string[] = DEFAULT_CONFIG.delimiters;

/**
 * Builds a reverse map from `"start|end"` bounds keys to the shortest alias
 * that resolves to those bounds. When multiple aliases point to the same
 * canonical named range, the shortest one wins.
 */
function buildBoundsToAliasMap(config: ParserConfig): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const [alias, canonical] of Object.entries(config.namedRangeAliases)) {
    const range = config.namedRanges[canonical];
    if (!range) continue;
    const key = `${range.start}|${range.end}`;
    const existing = map.get(key);
    if (!existing || alias.length < existing.length) {
      map.set(key, alias);
    }
  }
  return map;
}

const boundsToAlias = buildBoundsToAliasMap(DEFAULT_CONFIG);

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
 * input unchanged if it is not an alias.
 *
 * @example
 * resolveNamedRangeAlias('td')    // "today"
 * resolveNamedRangeAlias('yd')    // "yesterday"
 * resolveNamedRangeAlias('today') // "today"
 */
export function resolveNamedRangeAlias(text: string): string {
  return DEFAULT_CONFIG.namedRangeAliases[text.toLowerCase()] ?? text;
}

/** Builds a regex that splits text on a word delimiter surrounded by whitespace. */
export function buildDelimiterPattern(delimiter: string): RegExp | null {
  const trimmed = delimiter.trim();
  return trimmed ? new RegExp(`^(.+?)\\s+${escapeRegExp(trimmed)}\\s+(.+)$`) : null;
}

/**
 * Converts a natural-language template (e.g. `'{count} {unit} ago'`)
 * into a regex, tracking capture-group positions for count and unit.
 */
function compileTemplate(template: string): CompiledTemplate {
  const parts = template.split(/(\{count}|\{unit})/);
  let pattern = '';
  let groupIdx = 0;
  let countGroup = -1;
  let unitGroup = -1;

  for (const part of parts) {
    if (part === '{count}') {
      countGroup = ++groupIdx;
      pattern += '(\\d+)';
    } else if (part === '{unit}') {
      unitGroup = ++groupIdx;
      pattern += '(\\w+)';
    } else {
      pattern += escapeRegExp(part).replace(/ /g, '\\s+');
    }
  }

  return { regex: new RegExp(`^${pattern}$`, 'i'), countGroup, unitGroup };
}

function compileConfig(config: ParserConfig): CompiledConfig {
  const unitKeys = Object.keys(config.unitAliases)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');

  const delimiterPatterns = [...config.delimiters, '-']
    .map(buildDelimiterPattern)
    .filter((p): p is RegExp => p !== null);

  return {
    shorthandRegex: new RegExp(`^(now)?([+-]?)(\\d+)(${unitKeys})(\\/[smhdwMy])?$`),
    durationPast: config.durationTemplates.past.map(compileTemplate),
    durationFuture: config.durationTemplates.future.map(compileTemplate),
    instantPast: config.instantTemplates.past.map(compileTemplate),
    instantFuture: config.instantTemplates.future.map(compileTemplate),
    absoluteFormats: config.absoluteFormats,
    delimiterPatterns,
  };
}

function getCompiledConfig(config: ParserConfig): CompiledConfig {
  let compiled = configCache.get(config);
  if (!compiled) {
    compiled = compileConfig(config);
    configCache.set(config, compiled);
  }
  return compiled;
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
 * Supports presets, named ranges, natural durations/instants,
 * shorthand datemath, unix timestamps, and absolute dates.
 */
export function textToTimeRange(text: string, options?: TimeRangeTransformOptions): TimeRange {
  const trimmed = text.trim();
  if (!trimmed) return buildInvalidRange(text);

  const config = DEFAULT_CONFIG;
  const compiled = getCompiledConfig(config);
  const { presets = [], delimiter, dateFormat, roundRelativeTime } = options ?? {};
  const formats = dateFormat ? [dateFormat, ...compiled.absoluteFormats] : compiled.absoluteFormats;

  // (1) Preset label match
  const preset = matchPreset(trimmed, presets);
  if (preset) {
    const roundedStart = applyStartBoundRounding(preset.start, roundRelativeTime);
    return buildRange(text, roundedStart, preset.end, formats, true);
  }

  // (2) Named range ("today", "yesterday", "this week", ...) or alias ("td", "yd", "tmr")
  const lower = trimmed.toLowerCase();
  const canonicalKey = config.namedRangeAliases[lower] ?? lower;
  const named = config.namedRanges[canonicalKey];
  if (named) {
    return buildRange(text, named.start, named.end, formats, true);
  }

  // (3) Natural duration ("last 7 minutes", "next 3 days")
  const duration = matchNaturalDuration(trimmed, config, compiled);
  if (duration) {
    const roundedStart = applyStartBoundRounding(duration.start, roundRelativeTime);
    return buildRange(text, roundedStart, duration.end, formats, true);
  }

  // (4) Try splitting on delimiters (config + universal dash + extra)
  const parts = trySplit(trimmed, compiled, delimiter);
  if (parts) {
    const startDateString = instantToDateString(parts[0], config, compiled, formats);
    const endDateString = instantToDateString(parts[1], config, compiled, formats);
    if (startDateString && endDateString) {
      const roundedStart = applyStartBoundRounding(startDateString, roundRelativeTime);
      return buildRange(text, roundedStart, endDateString, formats, false);
    }
    return buildInvalidRange(text);
  }

  // (5) Single instant (no delimiter found)
  const dateString = instantToDateString(trimmed, config, compiled, formats);
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

/** Resolves a user-typed unit string through aliases (exact first, then lowercase). */
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
  config: ParserConfig,
  compiled: CompiledConfig,
  formats: string[]
): DateString | null {
  const trimmed = text.trim();

  if (trimmed.toLowerCase() === config.nowKeyword) return 'now';

  // Shorthand: "7d", "-7d", "+7d", "now-7d/d", "500ms"
  const shorthandMatch = trimmed.match(compiled.shorthandRegex);
  if (shorthandMatch) {
    const unit = resolveUnit(shorthandMatch[4], config.unitAliases);
    if (unit) {
      const operator = shorthandMatch[2] === '+' ? '+' : '-';
      return `now${operator}${shorthandMatch[3]}${unit}${shorthandMatch[5] ?? ''}`;
    }
  }

  // Natural instant: "7 minutes ago", "in 7 minutes"
  const instant = matchNaturalInstant(trimmed, config, compiled);
  if (instant) return instant;

  const unixDate = unixTimestampToDate(trimmed);
  if (unixDate) return unixDate.toISOString();

  // DateMath with rounding only (e.g. "now/d", "now/w") — preserve as-is.
  // These aren't caught by the shorthand regex which expects a count.
  if (/^now\/[smhdwMy]$/.test(trimmed)) return trimmed;

  // Absolute date / ISO fallback — normalize to ISO so that
  // timeRange.start/end and onChange always emit ISO or dateMath strings.
  const absoluteDate = dateStringToDate(trimmed, formats);
  if (absoluteDate !== null) return absoluteDate.toISOString();

  return null;
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
  options?: { roundUp?: boolean }
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
 * Tries in order: extra delimiter, then compiled config + universal dash patterns.
 */
function trySplit(text: string, compiled: CompiledConfig, extra?: string): [string, string] | null {
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
  config: ParserConfig,
  compiled: CompiledConfig
): { start: DateString; end: DateString } | null {
  const past = matchTemplates(
    text,
    compiled.durationPast,
    config.unitAliases,
    (count, unit) => `now-${count}${unit}`
  );
  if (past) return { start: past, end: 'now' };

  const future = matchTemplates(
    text,
    compiled.durationFuture,
    config.unitAliases,
    (count, unit) => `now+${count}${unit}`
  );
  if (future) return { start: 'now', end: future };

  return null;
}

function matchNaturalInstant(
  text: string,
  config: ParserConfig,
  compiled: CompiledConfig
): DateString | null {
  return (
    matchTemplates(
      text,
      compiled.instantPast,
      config.unitAliases,
      (count, unit) => `now-${count}${unit}`
    ) ??
    matchTemplates(
      text,
      compiled.instantFuture,
      config.unitAliases,
      (count, unit) => `now+${count}${unit}`
    )
  );
}
