/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { DATE_RANGE_DISPLAY_DELIMITER, DATE_TYPE_NOW, NOW_KEYWORD } from '../constants';
import type { DateType } from '../types';
import { PARSER_DELIMITERS, buildDelimiterPattern, escapeRegExp } from './parse_text';

export type DateUnit = 'month' | 'day' | 'year' | 'hour' | 'minute' | 'second' | 'millisecond';

export type PartKind =
  | DateUnit
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

// TODO some of these target English words, we need to account for translations very soon
//
// TODO Share input grammar with parse_text.ts. The regexes below describe the
// same syntax as the compiled templates there (durations like "last 7 days",
// instants like "in 5 minutes", shorthand like "now-7d/d"), so changes need to
// be made in both places — e.g. "past" matches durationPast in parse_text and
// is now mirrored in LONG_RELATIVE_RE here. Plan: extend CompiledTemplate to
// expose direction-token group positions, export the templates from
// parse_text.ts, and consume them here to drive RangePart emission from a
// single source.
const INPUT_DELIMITERS = [...PARSER_DELIMITERS, '-'];
const SHORTHAND_RELATIVE_RE = /^(now)?([+-])(\d+)([a-zA-Z]+)(\/[smhdwMy])?$/;
const LONG_RELATIVE_RE = /^(last|past|next)\s+(\d+)\s+(\w+)$/i;
const NATURAL_INSTANT_RE = /^(\d+)\s+(\w+)\s+(ago|from now)$/i;
const INSTANT_FROM_NOW_RE = /^(in)\s+(\d+)\s+(\w+)$/i;
const INPUT_ABSOLUTE_FORMATS = [
  // Keep this list in sync with parse_text.ts DEFAULT_CONFIG.absoluteFormats
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

const findDelimiterSplit = (value: string, delimiters: string[]): DelimiterSplit | null => {
  for (const delimiter of delimiters) {
    const pattern = buildDelimiterPattern(delimiter);
    const match = pattern ? value.match(pattern) : null;
    if (!match) continue;

    const left = match[1];
    const separatorWithWhitespace = value
      .slice(left.length)
      .match(new RegExp(`^\\s+${escapeRegExp(delimiter)}\\s+`));
    if (!separatorWithWhitespace) continue;

    const separatorStart =
      left.length + separatorWithWhitespace[0].indexOf(separatorWithWhitespace[0].trim());
    const separatorEnd = separatorStart + delimiter.length;
    const rightOffset = left.length + separatorWithWhitespace[0].length;
    const right = value.slice(rightOffset);

    if (!left.trim() || !right.trim()) continue;

    return {
      left,
      right,
      rightOffset,
      separator: {
        text: delimiter,
        start: separatorStart,
        end: separatorEnd,
        kind: 'separator',
        navigable: false,
        rangeIndex: null,
      },
    };
  }

  return null;
};

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

const parseLongRelative = (
  side: string,
  offset: number,
  rangeIndex: RangePart['rangeIndex']
): RangePart[] | null => {
  const match = side.match(LONG_RELATIVE_RE);
  if (!match) return null;

  const [, direction, value, unit] = match;
  const parts: RangePart[] = [];
  let cursor = 0;

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
  addCapturedPart(parts, side, offset, unit, cursor, 'relative-unit', true, rangeIndex);

  return parts;
};

const parseNaturalInstant = (
  side: string,
  offset: number,
  rangeIndex: RangePart['rangeIndex']
): RangePart[] | null => {
  const instantMatch = side.match(NATURAL_INSTANT_RE);
  if (instantMatch) {
    const [, value, unit, direction] = instantMatch;
    const parts: RangePart[] = [];
    let cursor = 0;
    cursor = addCapturedPart(
      parts,
      side,
      offset,
      value,
      cursor,
      'relative-value',
      true,
      rangeIndex
    );
    cursor = addCapturedPart(parts, side, offset, unit, cursor, 'relative-unit', true, rangeIndex);
    addCapturedPart(parts, side, offset, direction, cursor, 'literal', false, rangeIndex);
    return parts;
  }

  const fromNowMatch = side.match(INSTANT_FROM_NOW_RE);
  if (fromNowMatch) {
    const [, direction, value, unit] = fromNowMatch;
    const parts: RangePart[] = [];
    let cursor = 0;
    cursor = addCapturedPart(parts, side, offset, direction, cursor, 'literal', false, rangeIndex);
    cursor = addCapturedPart(
      parts,
      side,
      offset,
      value,
      cursor,
      'relative-value',
      true,
      rangeIndex
    );
    addCapturedPart(parts, side, offset, unit, cursor, 'relative-unit', true, rangeIndex);
    return parts;
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

const getFormatTokenKind = (token: FormatToken): DateUnit | null => {
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
    case 'ZZ':
    case 'Z':
      return null;
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

const parseAbsoluteDateWithFormat = (
  side: string,
  offset: number,
  rangeIndex: RangePart['rangeIndex'],
  format: string
): RangePart[] => {
  const segments = compileFormatTokens(format);
  const match = side.match(buildFormatRegex(segments));
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
    if (kind) {
      addPart(parts, tokenText, offset + tokenStart, kind, true, rangeIndex, format);
    }

    cursor = tokenStart + tokenText.length;
  }

  return parts;
};

const parseAbsoluteDate = (
  side: string,
  offset: number,
  rangeIndex: RangePart['rangeIndex']
): RangePart[] => {
  for (const format of INPUT_ABSOLUTE_FORMATS) {
    if (moment(side, format, true).isValid()) {
      return parseAbsoluteDateWithFormat(side, offset, rangeIndex, format);
    }
  }

  return [];
};

const parseSide = (
  side: string,
  offset: number,
  rangeIndex: RangePart['rangeIndex']
): RangePart[] => {
  const trimmed = getTrimmedSide(side, offset);
  if (!trimmed.text) return [];

  if (trimmed.text === NOW_KEYWORD) {
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
    parseLongRelative(trimmed.text, trimmed.offset, rangeIndex) ??
    parseNaturalInstant(trimmed.text, trimmed.offset, rangeIndex) ??
    parseAbsoluteDate(trimmed.text, trimmed.offset, rangeIndex)
  );
};

/**
 * Splits edit-input text into semantic range parts.
 */
export function parseInputParts(input: string, rangeType?: [DateType, DateType]): RangePart[] {
  const split = findDelimiterSplit(input, INPUT_DELIMITERS);
  if (split) {
    return [
      ...parseSide(split.left, 0, 0),
      split.separator,
      ...parseSide(split.right, split.rightOffset, 1),
    ];
  }

  return parseSide(input, 0, getSingleRangeIndex(rangeType));
}

/**
 * Splits idle button display text into semantic range parts.
 */
export function parseDisplayParts(display: string): RangePart[] {
  const split = findDelimiterSplit(display, [DATE_RANGE_DISPLAY_DELIMITER]);
  if (split) {
    return [
      ...parseSide(split.left, 0, 0),
      split.separator,
      ...parseSide(split.right, split.rightOffset, 1),
    ];
  }

  return parseSide(display, 0, null);
}
