/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
const ABSOLUTE_TOKEN_RE = /([A-Za-z]+|\d+)/g;
const MONTH_NAMES: ReadonlySet<string> = new Set([
  'jan',
  'january',
  'feb',
  'february',
  'mar',
  'march',
  'apr',
  'april',
  'may',
  'jun',
  'june',
  'jul',
  'july',
  'aug',
  'august',
  'sep',
  'sept',
  'september',
  'oct',
  'october',
  'nov',
  'november',
  'dec',
  'december',
]);

const getMatchIndex = (match: RegExpMatchArray): number => match.index ?? 0;

const addPart = (
  parts: RangePart[],
  text: string,
  start: number,
  kind: PartKind,
  navigable: boolean,
  rangeIndex: RangePart['rangeIndex']
) => {
  parts.push({
    text,
    start,
    end: start + text.length,
    kind,
    navigable,
    rangeIndex,
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

const getAbsoluteNumericKind = (numericIndex: number, isTimeOnly: boolean): DateUnit => {
  const numericKinds: DateUnit[] = isTimeOnly
    ? ['hour', 'minute', 'second', 'millisecond']
    : ['day', 'hour', 'minute', 'second', 'millisecond'];

  return numericKinds[numericIndex] ?? 'millisecond';
};

const parseAbsoluteDate = (
  side: string,
  offset: number,
  rangeIndex: RangePart['rangeIndex']
): RangePart[] => {
  const tokens = Array.from(side.matchAll(ABSOLUTE_TOKEN_RE));
  const hasMonth = tokens.some((match) => MONTH_NAMES.has(match[0].toLowerCase()));
  const isTimeOnly = !hasMonth && side.includes(':');
  const parts: RangePart[] = [];
  let numericIndex = 0;

  for (const token of tokens) {
    const text = token[0];
    const start = offset + getMatchIndex(token);
    const lower = text.toLowerCase();

    if (MONTH_NAMES.has(lower)) {
      addPart(parts, text, start, 'month', true, rangeIndex);
      continue;
    }

    if (!/^\d+$/.test(text)) {
      continue;
    }

    if (/^\d{4}$/.test(text)) {
      addPart(parts, text, start, 'year', true, rangeIndex);
      continue;
    }

    addPart(parts, text, start, getAbsoluteNumericKind(numericIndex, isTimeOnly), true, rangeIndex);
    numericIndex++;
  }

  return parts;
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
