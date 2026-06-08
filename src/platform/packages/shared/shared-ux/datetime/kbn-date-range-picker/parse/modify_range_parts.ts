/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';

import type { PartKind, RangePart } from './parse_range_parts';

type ModificationAction = 'increase' | 'decrease';
type RelativeUnit = (typeof RELATIVE_UNIT_CYCLE)[number];

const RELATIVE_UNIT_CYCLE = ['ms', 's', 'm', 'h', 'd', 'w', 'M', 'y'] as const;
const ROUNDING_UNIT_CYCLE = ['s', 'm', 'h', 'd'] as const;

// TODO centralize these English-only aliases and labels with the input parser
// grammar before adding localized date range input support.
const RELATIVE_UNIT_ALIASES: Readonly<Record<string, RelativeUnit>> = {
  ms: 'ms',
  millisecond: 'ms',
  milliseconds: 'ms',
  s: 's',
  second: 's',
  seconds: 's',
  sec: 's',
  secs: 's',
  m: 'm',
  minute: 'm',
  minutes: 'm',
  min: 'm',
  mins: 'm',
  h: 'h',
  hour: 'h',
  hours: 'h',
  hr: 'h',
  hrs: 'h',
  d: 'd',
  day: 'd',
  days: 'd',
  w: 'w',
  week: 'w',
  weeks: 'w',
  wk: 'w',
  wks: 'w',
  M: 'M',
  month: 'M',
  months: 'M',
  mo: 'M',
  mos: 'M',
  y: 'y',
  year: 'y',
  years: 'y',
  yr: 'y',
  yrs: 'y',
};
const RELATIVE_UNIT_WORDS: Readonly<Record<RelativeUnit, { singular: string; plural: string }>> = {
  ms: { singular: 'millisecond', plural: 'milliseconds' },
  s: { singular: 'second', plural: 'seconds' },
  m: { singular: 'minute', plural: 'minutes' },
  h: { singular: 'hour', plural: 'hours' },
  d: { singular: 'day', plural: 'days' },
  w: { singular: 'week', plural: 'weeks' },
  M: { singular: 'month', plural: 'months' },
  y: { singular: 'year', plural: 'years' },
};
// Maps a step-able absolute date part to the moment duration unit it advances.
// `weekday` steps by whole days so that arrow keys move the date forward/back.
const ABSOLUTE_STEP_UNITS: Readonly<
  Partial<Record<PartKind, moment.unitOfTime.DurationConstructor>>
> = {
  year: 'years',
  month: 'months',
  day: 'days',
  weekday: 'days',
  hour: 'hours',
  minute: 'minutes',
  second: 'seconds',
  millisecond: 'milliseconds',
};

const TIMEZONE_STEP_MINUTES = 60;
const MIN_UTC_OFFSET_MINUTES = -12 * 60;
const MAX_UTC_OFFSET_MINUTES = 14 * 60;

const splicePart = (text: string, part: RangePart, replacement: string): string | undefined => {
  if (part.text === replacement) return undefined;
  return `${text.slice(0, part.start)}${replacement}${text.slice(part.end)}`;
};

const resolveRelativeUnit = (unit: string): RelativeUnit | undefined =>
  RELATIVE_UNIT_ALIASES[unit] ?? RELATIVE_UNIT_ALIASES[unit.toLowerCase()];

const getNextCycleValue = <T extends string>(
  cycle: readonly T[],
  current: T,
  action: ModificationAction
): T | undefined => {
  const currentIndex = cycle.indexOf(current);
  if (currentIndex === -1) return undefined;
  const nextIndex = action === 'increase' ? currentIndex + 1 : currentIndex - 1;
  return cycle[nextIndex];
};

const matchCasing = (source: string, replacement: string): string => {
  if (source.toUpperCase() === source) return replacement.toUpperCase();
  if (source[0]?.toUpperCase() === source[0]) {
    return `${replacement[0].toUpperCase()}${replacement.slice(1)}`;
  }
  return replacement;
};

const getRelativeValue = (part: RangePart, parts: RangePart[]): number | undefined => {
  const valuePart = parts.find(
    (candidate) => candidate.rangeIndex === part.rangeIndex && candidate.kind === 'relative-value'
  );
  if (!valuePart || !/^\d+$/.test(valuePart.text)) return undefined;
  return parseInt(valuePart.text, 10);
};

const isShorthandUnit = (part: RangePart, parts: RangePart[]): boolean => {
  const valuePart = parts.find(
    (candidate) => candidate.rangeIndex === part.rangeIndex && candidate.kind === 'relative-value'
  );
  return valuePart?.end === part.start;
};

const modifyRelativeValue = (
  text: string,
  part: RangePart,
  action: ModificationAction
): string | undefined => {
  if (!/^\d+$/.test(part.text)) return undefined;
  const currentValue = parseInt(part.text, 10);
  const nextValue = action === 'increase' ? currentValue + 1 : currentValue - 1;
  if (nextValue < 1) return undefined;
  return splicePart(text, part, String(nextValue));
};

const modifyRelativeDirection = (
  text: string,
  part: RangePart,
  action: ModificationAction
): string | undefined => {
  if (part.text === '-') return action === 'increase' ? splicePart(text, part, '+') : undefined;
  if (part.text === '+') return action === 'decrease' ? splicePart(text, part, '-') : undefined;

  const direction = part.text.toLowerCase();
  if ((direction === 'last' || direction === 'past') && action === 'increase') {
    return splicePart(text, part, matchCasing(part.text, 'next'));
  }
  if (direction === 'next' && action === 'decrease') {
    return splicePart(text, part, matchCasing(part.text, 'last'));
  }

  return undefined;
};

const modifyRelativeUnit = (
  text: string,
  part: RangePart,
  action: ModificationAction,
  parts: RangePart[]
): string | undefined => {
  const currentUnit = resolveRelativeUnit(part.text);
  if (!currentUnit) return undefined;

  const nextUnit = getNextCycleValue(RELATIVE_UNIT_CYCLE, currentUnit, action);
  if (!nextUnit) return undefined;

  if (isShorthandUnit(part, parts)) {
    return splicePart(text, part, nextUnit);
  }

  const currentValue = getRelativeValue(part, parts);
  if (currentValue === undefined) return undefined;
  const unitWords = RELATIVE_UNIT_WORDS[nextUnit];
  const nextText = currentValue === 1 ? unitWords.singular : unitWords.plural;
  return splicePart(text, part, nextText);
};

const modifyRoundingUnit = (
  text: string,
  part: RangePart,
  action: ModificationAction
): string | undefined => {
  const currentUnit = ROUNDING_UNIT_CYCLE.find((unit) => unit === part.text);
  if (!currentUnit) return undefined;
  const nextUnit = getNextCycleValue(ROUNDING_UNIT_CYCLE, currentUnit, action);
  if (!nextUnit) return undefined;
  return splicePart(text, part, nextUnit);
};

interface AbsoluteSide {
  start: number;
  end: number;
  text: string;
  format: string;
  parsed: moment.Moment;
}

/**
 * Reconstructs the full text and parsed value for the absolute-date side that
 * `part` belongs to. The span covers every date token on that side — including
 * day-of-week and timezone parts — so strict parsing against `part.format`
 * succeeds even for formats like RFC 2822. `parseZone` preserves any explicit
 * UTC offset present in the input.
 */
const getAbsoluteSide = (
  text: string,
  part: RangePart,
  parts: RangePart[]
): AbsoluteSide | undefined => {
  if (!part.format) return undefined;

  const sideParts = parts.filter(
    (candidate) =>
      candidate.rangeIndex === part.rangeIndex &&
      candidate.kind !== 'separator' &&
      candidate.kind !== 'literal'
  );
  if (sideParts.length === 0) return undefined;

  const start = Math.min(...sideParts.map((candidate) => candidate.start));
  const end = Math.max(...sideParts.map((candidate) => candidate.end));
  const sideText = text.slice(start, end);
  const parsed = moment.parseZone(sideText, part.format, true);
  if (!parsed.isValid()) return undefined;

  return { start, end, text: sideText, format: part.format, parsed };
};

const spliceSide = (text: string, side: AbsoluteSide, nextSideText: string): string | undefined => {
  if (nextSideText === side.text) return undefined;
  return `${text.slice(0, side.start)}${nextSideText}${text.slice(side.end)}`;
};

const modifyAbsoluteDate = (
  text: string,
  part: RangePart,
  action: ModificationAction,
  parts: RangePart[]
): string | undefined => {
  const unit = ABSOLUTE_STEP_UNITS[part.kind];
  if (!unit) return undefined;

  const side = getAbsoluteSide(text, part, parts);
  if (!side) return undefined;

  const amount = action === 'increase' ? 1 : -1;
  const nextSideText = side.parsed.add(amount, unit).format(side.format);
  return spliceSide(text, side, nextSideText);
};

const modifyAbsoluteTimezone = (
  text: string,
  part: RangePart,
  action: ModificationAction,
  parts: RangePart[]
): string | undefined => {
  const side = getAbsoluteSide(text, part, parts);
  if (!side) return undefined;

  const amount = action === 'increase' ? TIMEZONE_STEP_MINUTES : -TIMEZONE_STEP_MINUTES;
  const nextOffset = side.parsed.utcOffset() + amount;
  if (nextOffset < MIN_UTC_OFFSET_MINUTES || nextOffset > MAX_UTC_OFFSET_MINUTES) return undefined;

  // Passing `true` keeps the wall-clock time and only rewrites the offset.
  const nextSideText = side.parsed.utcOffset(nextOffset, true).format(side.format);
  return spliceSide(text, side, nextSideText);
};

/**
 * Applies an arrow-key modification to a selected range part.
 */
export function applyPartModification(
  text: string,
  part: RangePart,
  action: ModificationAction,
  parts: RangePart[]
): string | undefined {
  switch (part.kind) {
    case 'relative-value':
      return modifyRelativeValue(text, part, action);
    case 'relative-direction':
      return modifyRelativeDirection(text, part, action);
    case 'relative-unit':
      return modifyRelativeUnit(text, part, action, parts);
    case 'rounding-unit':
      return modifyRoundingUnit(text, part, action);
    case 'month':
    case 'day':
    case 'year':
    case 'hour':
    case 'minute':
    case 'second':
    case 'millisecond':
    case 'weekday':
      return modifyAbsoluteDate(text, part, action, parts);
    case 'timezone':
      return modifyAbsoluteTimezone(text, part, action, parts);
    default:
      return undefined;
  }
}
