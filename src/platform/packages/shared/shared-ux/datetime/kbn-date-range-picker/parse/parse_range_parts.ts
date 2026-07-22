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
import { DATE_RANGE_DISPLAY_DELIMITER, DATE_TYPE_NOW } from '../constants';
import type { DateType } from '../types';
import {
  escapeRegExp,
  findDelimiterSplits,
  getCompiledGrammar,
  type CompiledGrammar,
  type CompiledTemplate,
} from './locale_grammar';

export type DateUnit = 'month' | 'day' | 'year' | 'hour' | 'minute' | 'second' | 'millisecond';

export type PartKind =
  | DateUnit
  | 'weekday'
  | 'timezone'
  | 'relative-direction'
  | 'relative-value'
  | 'relative-unit'
  | 'rounding-unit'
  | 'separator'
  | 'literal';

export interface RangePart {
  text: string;
  start: number;
  end: number;
  kind: PartKind;
  navigable: boolean;
  rangeIndex: 0 | 1 | null;
  format?: string;
}

interface DelimiterSplit {
  left: string;
  right: string;
  rightOffset: number;
  separator: RangePart;
}

/**
 * Shorthand datemath (`now-7d/d`) is locale-invariant technical syntax, not
 * natural language — it stays a standalone regex, untouched by localization.
 */
const SHORTHAND_RELATIVE_RE = /^(now)?([+-])(\d+)([a-zA-Z]+)(\/[smhdwMy])?$/;

// Absolute-date parsing is deliberately locale-invariant for now (localized
// absolute dates are a deferred phase — see the i18n plan doc).
const INPUT_ABSOLUTE_FORMATS = [
  // Keep this list in sync with parse_text.ts ABSOLUTE_FORMATS
  // and the formats emitted by format_time_range.ts.
  'MMM D, YYYY, HH:mm:ss.SSS',
  'MMM D YYYY, HH:mm:ss.SSS',
  'MMM D, YYYY, HH:mm:ss',
  'MMM D YYYY, HH:mm:ss',
  'MMM D, YYYY, HH:mm',
  'MMM D YYYY, HH:mm',
  'MMM D, YYYY @ HH:mm:ss.SSS',
  'MMM D, YYYY @ HH:mm:ss',
  'MMM D, YYYY @ HH:mm',
  'MMM D, YYYY @ HH',
  'MMM D, YYYY',
  'MMM D YYYY',
  'MMM D, HH:mm:ss.SSS',
  'MMM D, HH:mm:ss',
  'MMM D, HH:mm',
  'MMM D',
  'YYYY-MM-DD H:mm',
  'M/D/YYYY H:mm',
  'M/D H:mm',
  'M/D/YYYY',
  'M/D',
  'ddd, DD MMM YY HH:mm:ss ZZ',
  'ddd, DD MMM YY HH:mm ZZ',
  'DD MMM YY HH:mm:ss ZZ',
  'DD MMM YY HH:mm ZZ',
  'ddd, DD MMM YYYY HH:mm:ss ZZ',
  'ddd, DD MMM YYYY HH:mm ZZ',
  'DD MMM YYYY HH:mm:ss ZZ',
  'DD MMM YYYY HH:mm ZZ',
  'ddd, DD MMM YYYY HH:mm:ss',
  'ddd, DD MMM YYYY HH:mm',
  'DD MMM YYYY HH:mm:ss',
  'DD MMM YYYY HH:mm',
  // Time-only sides are emitted by compact display text.
  'HH:mm:ss.SSS',
  'HH:mm:ss',
  'HH:mm',
] as const;
const FORMAT_TOKEN_RE = /MMMM|MMM|YYYY|SSS|dddd|ddd|YY|DD|HH|ZZ|MM|M|D|H|mm|ss|Z/g;

type FormatToken =
  | 'MMMM'
  | 'MMM'
  | 'MM'
  | 'M'
  | 'YYYY'
  | 'YY'
  | 'DD'
  | 'D'
  | 'HH'
  | 'H'
  | 'mm'
  | 'ss'
  | 'SSS'
  | 'dddd'
  | 'ddd'
  | 'ZZ'
  | 'Z';

type FormatSegment =
  | {
      type: 'literal';
      text: string;
    }
  | {
      type: 'token';
      token: FormatToken;
    };

/** A regex match produced with the `d` (hasIndices) flag set. */
type IndexedMatch = RegExpMatchArray & { indices: Array<[number, number] | undefined> };

const addPart = (
  parts: RangePart[],
  text: string,
  start: number,
  kind: PartKind,
  navigable: boolean,
  rangeIndex: RangePart['rangeIndex'],
  format?: string
) => {
  parts.push({
    text,
    start,
    end: start + text.length,
    kind,
    navigable,
    rangeIndex,
    ...(format ? { format } : {}),
  });
};

const addCapturedPart = (
  parts: RangePart[],
  source: string,
  baseOffset: number,
  text: string,
  cursor: number,
  kind: PartKind,
  navigable: boolean,
  rangeIndex: RangePart['rangeIndex']
): number => {
  const localStart = source.indexOf(text, cursor);
  if (localStart === -1) return cursor;
  addPart(parts, text, baseOffset + localStart, kind, navigable, rangeIndex);
  return localStart + text.length;
};

/**
 * Enumerates every delimiter-split candidate for `value` — all occurrences of
 * each delimiter, in delimiter order then left-to-right. Callers pick the
 * first candidate whose sides both parse (see {@link findDelimiterSplits} for
 * why the first occurrence isn't automatically the right one).
 */
const findDelimiterSplitCandidates = (value: string, delimiters: string[]): DelimiterSplit[] =>
  delimiters.flatMap((delimiter) =>
    findDelimiterSplits(value, delimiter).map(
      ({ left, right, rightOffset, delimiterStart, delimiterEnd }): DelimiterSplit => ({
        left,
        right,
        rightOffset,
        separator: {
          text: delimiter.trim(),
          start: delimiterStart,
          end: delimiterEnd,
          kind: 'separator',
          navigable: false,
          rangeIndex: null,
        },
      })
    )
  );

const getTrimmedSide = (side: string, offset: number): { text: string; offset: number } => {
  const trimmedStart = side.search(/\S/);
  if (trimmedStart === -1) return { text: '', offset };
  return { text: side.trim(), offset: offset + trimmedStart };
};

const getSingleRangeIndex = (rangeType?: [DateType, DateType]): RangePart['rangeIndex'] => {
  if (rangeType?.[1] === DATE_TYPE_NOW) return 0;
  if (rangeType?.[0] === DATE_TYPE_NOW) return 1;
  return 0;
};

const parseShorthandRelative = (
  side: string,
  offset: number,
  rangeIndex: RangePart['rangeIndex']
): RangePart[] | null => {
  const match = side.match(SHORTHAND_RELATIVE_RE);
  if (!match) return null;

  const [, nowPrefix, direction, value, unit, rounding] = match;
  const parts: RangePart[] = [];
  let cursor = 0;

  if (nowPrefix) {
    cursor = addCapturedPart(parts, side, offset, nowPrefix, cursor, 'literal', false, rangeIndex);
  }

  cursor = addCapturedPart(
    parts,
    side,
    offset,
    direction,
    cursor,
    'relative-direction',
    true,
    rangeIndex
  );
  cursor = addCapturedPart(parts, side, offset, value, cursor, 'relative-value', true, rangeIndex);
  cursor = addCapturedPart(parts, side, offset, unit, cursor, 'relative-unit', true, rangeIndex);

  if (rounding) {
    cursor = addCapturedPart(parts, side, offset, '/', cursor, 'separator', false, rangeIndex);
    addCapturedPart(
      parts,
      side,
      offset,
      rounding.slice(1),
      cursor,
      'rounding-unit',
      true,
      rangeIndex
    );
  }

  return parts;
};

// ---------------------------------------------------------------------------
// Template-driven relative parsing — duration ("last 7 days") and instant
// ("7 days ago", "in 5 minutes") phrases. Both share the SAME compiled
// templates `parse_text.ts` matches against (via `getCompiledGrammar`), so
// this file no longer maintains its own copy of the relative-phrase grammar.
// ---------------------------------------------------------------------------

const matchTemplateList = (
  side: string,
  templates: CompiledTemplate[]
): { template: CompiledTemplate; match: IndexedMatch } | null => {
  for (const template of templates) {
    const match = side.match(template.regex) as IndexedMatch | null;
    if (match) return { template, match };
  }
  return null;
};

/**
 * Walks a matched template's segments, emitting one `RangePart` per
 * placeholder (`relative-value`/`relative-unit`) and one per non-whitespace
 * literal span (using `literalKind`/`literalNavigable` — duration templates'
 * leading direction word is navigable, instant templates' "ago"/"in"/"from
 * now" markers are not). Positions come from the regex's `d`-flag indices,
 * not text search, so they're robust to case and whitespace differences
 * between the template and the actual matched input.
 */
const emitTemplateParts = (
  side: string,
  offset: number,
  rangeIndex: RangePart['rangeIndex'],
  template: CompiledTemplate,
  match: IndexedMatch,
  literalKind: PartKind,
  literalNavigable: boolean
): RangePart[] => {
  const parts: RangePart[] = [];
  let cursor = 0;

  const groupFor = (segmentIdx: number): number | null => {
    const segment = template.segments[segmentIdx];
    if (segment.type === 'count') return template.countGroup;
    if (segment.type === 'unit') return template.unitGroup;
    return null;
  };

  template.segments.forEach((segment, idx) => {
    if (segment.type === 'count' || segment.type === 'unit') {
      const group = groupFor(idx);
      const span = group !== null ? match.indices[group] : undefined;
      if (!span) return;
      const [start, end] = span;
      addPart(
        parts,
        side.slice(start, end),
        offset + start,
        segment.type === 'count' ? 'relative-value' : 'relative-unit',
        true,
        rangeIndex
      );
      cursor = end;
      return;
    }

    // Literal segment: spans from `cursor` to the start of the next
    // placeholder (or to the end of `side` if this is a trailing literal).
    const nextIdx = template.segments.findIndex(
      (s, i) => i > idx && (s.type === 'count' || s.type === 'unit')
    );
    const nextGroup = nextIdx === -1 ? null : groupFor(nextIdx);
    const nextSpan = nextGroup !== null ? match.indices[nextGroup] : undefined;
    const end = nextSpan ? nextSpan[0] : side.length;

    const raw = side.slice(cursor, end);
    const trimmedText = raw.trim();
    if (trimmedText) {
      const leadingWhitespace = raw.length - raw.trimStart().length;
      addPart(
        parts,
        trimmedText,
        offset + cursor + leadingWhitespace,
        literalKind,
        literalNavigable,
        rangeIndex
      );
    }
    cursor = end;
  });

  return parts;
};

const parseDurationTemplate = (
  side: string,
  offset: number,
  rangeIndex: RangePart['rangeIndex'],
  compiled: CompiledGrammar
): RangePart[] | null => {
  const past = matchTemplateList(side, compiled.durationPast);
  if (past) {
    return emitTemplateParts(
      side,
      offset,
      rangeIndex,
      past.template,
      past.match,
      'relative-direction',
      true
    );
  }

  const future = matchTemplateList(side, compiled.durationFuture);
  if (future) {
    return emitTemplateParts(
      side,
      offset,
      rangeIndex,
      future.template,
      future.match,
      'relative-direction',
      true
    );
  }

  return null;
};

const parseInstantTemplate = (
  side: string,
  offset: number,
  rangeIndex: RangePart['rangeIndex'],
  compiled: CompiledGrammar
): RangePart[] | null => {
  const past = matchTemplateList(side, compiled.instantPast);
  if (past) {
    return emitTemplateParts(side, offset, rangeIndex, past.template, past.match, 'literal', false);
  }

  const future = matchTemplateList(side, compiled.instantFuture);
  if (future) {
    return emitTemplateParts(
      side,
      offset,
      rangeIndex,
      future.template,
      future.match,
      'literal',
      false
    );
  }

  return null;
};

/** Compiles a moment format into literal and token segments. */
export const compileFormatTokens = (format: string): FormatSegment[] => {
  const segments: FormatSegment[] = [];
  let cursor = 0;

  for (const match of format.matchAll(FORMAT_TOKEN_RE)) {
    const tokenStart = match.index ?? 0;
    if (tokenStart > cursor) {
      segments.push({ type: 'literal', text: format.slice(cursor, tokenStart) });
    }
    segments.push({ type: 'token', token: match[0] as FormatToken });
    cursor = tokenStart + match[0].length;
  }

  if (cursor < format.length) {
    segments.push({ type: 'literal', text: format.slice(cursor) });
  }

  return segments;
};

const getFormatTokenPattern = (token: FormatToken): string => {
  switch (token) {
    case 'MMMM':
    case 'MMM':
    case 'dddd':
    case 'ddd':
      return '[A-Za-z]+';
    case 'YYYY':
      return '\\d{4}';
    case 'YY':
    case 'MM':
    case 'DD':
    case 'HH':
    case 'mm':
    case 'ss':
      return '\\d{2}';
    case 'SSS':
      return '\\d{3}';
    case 'M':
    case 'D':
    case 'H':
      return '\\d{1,2}';
    case 'ZZ':
      return '[+-]\\d{4}';
    case 'Z':
      return '(?:Z|[+-]\\d{2}:?\\d{2})';
  }
};

const getFormatTokenKind = (token: FormatToken): PartKind => {
  switch (token) {
    case 'MMMM':
    case 'MMM':
    case 'MM':
    case 'M':
      return 'month';
    case 'DD':
    case 'D':
      return 'day';
    case 'YYYY':
    case 'YY':
      return 'year';
    case 'HH':
    case 'H':
      return 'hour';
    case 'mm':
      return 'minute';
    case 'ss':
      return 'second';
    case 'SSS':
      return 'millisecond';
    case 'dddd':
    case 'ddd':
      return 'weekday';
    case 'ZZ':
    case 'Z':
      return 'timezone';
  }
};

const buildFormatRegex = (segments: FormatSegment[]): RegExp =>
  new RegExp(
    `^${segments
      .map((segment) =>
        segment.type === 'literal'
          ? escapeRegExp(segment.text)
          : `(${getFormatTokenPattern(segment.token)})`
      )
      .join('')}$`
  );

interface CompiledFormat {
  format: string;
  segments: FormatSegment[];
  regex: RegExp;
}

// `INPUT_ABSOLUTE_FORMATS` is fixed, so the segments and matching regex for each
// format only need to be compiled once at module load rather than on every parse.
const COMPILED_ABSOLUTE_FORMATS: readonly CompiledFormat[] = INPUT_ABSOLUTE_FORMATS.map(
  (format) => {
    const segments = compileFormatTokens(format);
    return { format, segments, regex: buildFormatRegex(segments) };
  }
);

const parseAbsoluteDateWithFormat = (
  side: string,
  offset: number,
  rangeIndex: RangePart['rangeIndex'],
  { format, segments, regex }: CompiledFormat
): RangePart[] => {
  const match = side.match(regex);
  if (!match) return [];

  const parts: RangePart[] = [];
  let captureIndex = 1;
  let cursor = 0;

  for (const segment of segments) {
    if (segment.type === 'literal') {
      cursor += segment.text.length;
      continue;
    }

    const tokenText = match[captureIndex++];
    const tokenStart = side.indexOf(tokenText, cursor);
    if (tokenStart === -1) return [];

    const kind = getFormatTokenKind(segment.token);
    addPart(parts, tokenText, offset + tokenStart, kind, true, rangeIndex, format);

    cursor = tokenStart + tokenText.length;
  }

  return parts;
};

const parseAbsoluteDate = (
  side: string,
  offset: number,
  rangeIndex: RangePart['rangeIndex']
): RangePart[] => {
  for (const compiled of COMPILED_ABSOLUTE_FORMATS) {
    if (moment(side, compiled.format, true).isValid()) {
      return parseAbsoluteDateWithFormat(side, offset, rangeIndex, compiled);
    }
  }

  return [];
};

const parseSide = (
  side: string,
  offset: number,
  rangeIndex: RangePart['rangeIndex'],
  compiled: CompiledGrammar
): RangePart[] => {
  const trimmed = getTrimmedSide(side, offset);
  if (!trimmed.text) return [];

  if (compiled.nowKeywords.includes(trimmed.text)) {
    return [
      {
        text: trimmed.text,
        start: trimmed.offset,
        end: trimmed.offset + trimmed.text.length,
        kind: 'literal',
        navigable: false,
        rangeIndex,
      },
    ];
  }

  return (
    parseShorthandRelative(trimmed.text, trimmed.offset, rangeIndex) ??
    parseDurationTemplate(trimmed.text, trimmed.offset, rangeIndex, compiled) ??
    parseInstantTemplate(trimmed.text, trimmed.offset, rangeIndex, compiled) ??
    parseAbsoluteDate(trimmed.text, trimmed.offset, rangeIndex)
  );
};

/** Infers which side a compact one-sided display label edits. */
const getCompactDisplayRangeIndex = (
  display: string,
  compiled: CompiledGrammar
): RangePart['rangeIndex'] => {
  const trimmed = display.trim();
  const isFutureDuration = compiled.durationFuture.some((template) => template.regex.test(trimmed));
  const isFutureInstant = compiled.instantFuture.some((template) => template.regex.test(trimmed));
  return isFutureDuration || isFutureInstant ? 1 : 0;
};

const emitSplitParts = (split: DelimiterSplit, compiled: CompiledGrammar): RangePart[] => [
  ...parseSide(split.left, 0, 0, compiled),
  split.separator,
  ...parseSide(split.right, split.rightOffset, 1, compiled),
];

/**
 * Splits edit-input text into semantic range parts. Named ranges, durations,
 * instants, and delimiters are matched against `locale` merged with English.
 *
 * Delimiter occurrences are candidates, not authoritative: the first split
 * whose sides BOTH parse wins, then the whole input is tried as a single
 * side (a phrase like French "il y a 3 jours" contains the delimiter word
 * "a" without being a range), and only then does the first candidate's
 * separator-only decomposition apply (partially-typed ranged input).
 */
export function parseInputParts(
  input: string,
  rangeType?: [DateType, DateType],
  locale?: string
): RangePart[] {
  const compiled = getCompiledGrammar(locale ?? i18n.getLocale());
  const candidates = findDelimiterSplitCandidates(input, [...compiled.delimiters, '-']);
  for (const split of candidates) {
    const left = parseSide(split.left, 0, 0, compiled);
    const right = parseSide(split.right, split.rightOffset, 1, compiled);
    if (left.length && right.length) return [...left, split.separator, ...right];
  }

  const single = parseSide(input, 0, getSingleRangeIndex(rangeType), compiled);
  if (single.length || candidates.length === 0) return single;

  return emitSplitParts(candidates[0], compiled);
}

/**
 * Splits idle button display text into semantic range parts. The display
 * delimiter (`→`) is a locale-invariant symbol (it cannot appear inside a
 * phrase, so the first occurrence is authoritative); named ranges/durations/
 * instants within each side are matched against `locale` merged with English.
 */
export function parseDisplayParts(display: string, locale?: string): RangePart[] {
  const compiled = getCompiledGrammar(locale ?? i18n.getLocale());
  const [split] = findDelimiterSplitCandidates(display, [DATE_RANGE_DISPLAY_DELIMITER]);
  if (split) {
    return emitSplitParts(split, compiled);
  }

  return parseSide(display, 0, getCompactDisplayRangeIndex(display, compiled), compiled);
}
