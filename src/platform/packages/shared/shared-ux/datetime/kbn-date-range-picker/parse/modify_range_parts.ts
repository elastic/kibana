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

import { MODIFICATION_INCREASE, MODIFICATION_DECREASE } from '../constants';
import type { ModificationAction, TimeUnit } from '../types';
import {
  ENGLISH_GRAMMAR,
  getActiveGrammar,
  getCompiledGrammar,
  getPhraseWords,
  resolveUnit,
  type LocaleGrammar,
} from './locale_grammar';
import type { PartKind, RangePart } from './parse_range_parts';

const RELATIVE_UNIT_CYCLE: readonly TimeUnit[] = ['ms', 's', 'm', 'h', 'd', 'w', 'M', 'y'];
const ROUNDING_UNIT_CYCLE = ['s', 'm', 'h', 'd'] as const;

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

const getNextCycleValue = <T extends string>(
  cycle: readonly T[],
  current: T,
  action: ModificationAction
): T | undefined => {
  const currentIndex = cycle.indexOf(current);
  if (currentIndex === -1) return undefined;
  const nextIndex = action === MODIFICATION_INCREASE ? currentIndex + 1 : currentIndex - 1;
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
  const nextValue = action === MODIFICATION_INCREASE ? currentValue + 1 : currentValue - 1;
  if (nextValue < 1) return undefined;
  return splicePart(text, part, String(nextValue));
};

/** The leading direction word of a `"{word} {count} {unit}"`-shaped duration template. */
const extractLeadingWord = (template: string): string | undefined => template.match(/^(\S+)/)?.[0];

/**
 * Finds the opposite-direction word for `word` within `grammar`, or
 * `undefined` if `word` isn't one of this grammar's direction words, or the
 * `action` doesn't apply (e.g. stepping a future word further into the future).
 * Prefers the SAME-INDEX template's word for the target direction, so
 * inflected variants flip to their counterpart (German "letzter" ↔ "nächster",
 * French "dernières" ↔ "prochaines" — the locale grammars keep their template
 * lists index-aligned for this). Falls back to the first template's word when
 * the lists are asymmetric — matches historical behavior where "past" (an
 * alias of "last") flips forward to "next", but flipping back always lands on
 * the canonical "last".
 */
const getOppositeDirectionWord = (
  word: string,
  grammar: LocaleGrammar,
  action: ModificationAction
): string | undefined => {
  const lower = word.toLowerCase();
  const pastWords = grammar.durationTemplates.past
    .map(extractLeadingWord)
    .filter((w): w is string => !!w);
  const futureWords = grammar.durationTemplates.future
    .map(extractLeadingWord)
    .filter((w): w is string => !!w);

  if (action === MODIFICATION_INCREASE) {
    const index = pastWords.findIndex((w) => w.toLowerCase() === lower);
    if (index !== -1) return futureWords[index] ?? futureWords[0];
  }
  if (action === MODIFICATION_DECREASE) {
    const index = futureWords.findIndex((w) => w.toLowerCase() === lower);
    if (index !== -1) return pastWords[index] ?? pastWords[0];
  }
  return undefined;
};

const modifyRelativeDirection = (
  text: string,
  part: RangePart,
  action: ModificationAction,
  locale: string | undefined
): string | undefined => {
  if (part.text === '-') {
    return action === MODIFICATION_INCREASE ? splicePart(text, part, '+') : undefined;
  }
  if (part.text === '+') {
    return action === MODIFICATION_DECREASE ? splicePart(text, part, '-') : undefined;
  }

  // Preserve whichever language the current word belongs to — never silently
  // translate the user's own typed text into the active locale.
  const englishNext = getOppositeDirectionWord(part.text, ENGLISH_GRAMMAR, action);
  if (englishNext) return splicePart(text, part, matchCasing(part.text, englishNext));

  const activeGrammar = getActiveGrammar(locale);
  if (activeGrammar !== ENGLISH_GRAMMAR) {
    const localeNext = getOppositeDirectionWord(part.text, activeGrammar, action);
    if (localeNext) return splicePart(text, part, matchCasing(part.text, localeNext));
  }

  return undefined;
};

/** Words from the phrase's other parts (direction word / instant marker), lowercased. */
const getPhraseContextWords = (part: RangePart, parts: RangePart[]): string[] =>
  parts
    .filter(
      (candidate) =>
        candidate.rangeIndex === part.rangeIndex &&
        (candidate.kind === 'relative-direction' || candidate.kind === 'literal')
    )
    .flatMap((candidate) => candidate.text.toLowerCase().split(/\s+/));

/**
 * Resolves `text` to a canonical unit and the grammar whose word list it
 * belongs to. A surface form valid in both English and the active locale
 * (e.g. "minute", shared by English/German/French) is attributed via the
 * phrase's other words — "letzte 1 minute" is German, "last 1 minute" is
 * English. When those are ambiguous too ("in 1 minute" is a valid English AND
 * German instant), the active locale wins: the entire UI is rendered in it,
 * so it is the likelier language of the input.
 */
const resolveUnitSource = (
  text: string,
  locale: string | undefined,
  contextWords: string[]
): { unit: TimeUnit; grammar: LocaleGrammar } | undefined => {
  const activeGrammar = getActiveGrammar(locale);
  const englishUnit = resolveUnit(text, ENGLISH_GRAMMAR.unitAliases);
  const localeUnit =
    activeGrammar === ENGLISH_GRAMMAR ? undefined : resolveUnit(text, activeGrammar.unitAliases);

  if (localeUnit === undefined) {
    return englishUnit ? { unit: englishUnit, grammar: ENGLISH_GRAMMAR } : undefined;
  }
  if (englishUnit === undefined) return { unit: localeUnit, grammar: activeGrammar };

  const isEnglishPhrase = contextWords.some((word) => getPhraseWords(ENGLISH_GRAMMAR).has(word));
  const isLocalePhrase = contextWords.some((word) => getPhraseWords(activeGrammar).has(word));
  if (isEnglishPhrase && !isLocalePhrase) return { unit: englishUnit, grammar: ENGLISH_GRAMMAR };
  return { unit: localeUnit, grammar: activeGrammar };
};

const modifyRelativeUnit = (
  text: string,
  part: RangePart,
  action: ModificationAction,
  parts: RangePart[],
  locale: string | undefined
): string | undefined => {
  if (isShorthandUnit(part, parts)) {
    // Shorthand units are the canonical datemath symbol (ms/s/m/h/d/w/M/y),
    // identical across every locale — no word-form lookup needed.
    const compiled = getCompiledGrammar(locale);
    const currentUnit = resolveUnit(part.text, compiled.unitAliases);
    if (!currentUnit) return undefined;
    const nextUnit = getNextCycleValue(RELATIVE_UNIT_CYCLE, currentUnit, action);
    return nextUnit ? splicePart(text, part, nextUnit) : undefined;
  }

  const source = resolveUnitSource(part.text, locale, getPhraseContextWords(part, parts));
  if (!source) return undefined;

  const nextUnit = getNextCycleValue(RELATIVE_UNIT_CYCLE, source.unit, action);
  if (!nextUnit) return undefined;

  const currentValue = getRelativeValue(part, parts);
  if (currentValue === undefined) return undefined;

  // Instant phrases carry no direction word (their "vor"/"ago"/"in" marker is
  // a non-navigable literal) and take the grammar's instant agreement
  // overrides (e.g. German dative "vor 15 Tagen", never nominative "Tage").
  const isInstantPhrase = !parts.some(
    (candidate) =>
      candidate.rangeIndex === part.rangeIndex && candidate.kind === 'relative-direction'
  );
  const plurality = currentValue === 1 ? 'singular' : 'plural';
  const override = isInstantPhrase
    ? source.grammar.generation?.instantUnitWords?.[nextUnit]?.[plurality]
    : undefined;
  return splicePart(text, part, override ?? source.grammar.unitWords[nextUnit][plurality]);
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

  const amount = action === MODIFICATION_INCREASE ? 1 : -1;
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

  const amount = action === MODIFICATION_INCREASE ? TIMEZONE_STEP_MINUTES : -TIMEZONE_STEP_MINUTES;
  const nextOffset = side.parsed.utcOffset() + amount;
  if (nextOffset < MIN_UTC_OFFSET_MINUTES || nextOffset > MAX_UTC_OFFSET_MINUTES) return undefined;

  // Passing `true` keeps the wall-clock time and only rewrites the offset.
  const nextSideText = side.parsed.utcOffset(nextOffset, true).format(side.format);
  return spliceSide(text, side, nextSideText);
};

/**
 * Applies an arrow-key modification to a selected range part. Relative
 * direction/unit words are resolved against `locale` merged with English —
 * whichever language the part's CURRENT text belongs to is preserved (a part
 * already typed in English is never silently translated into the active
 * locale). A word valid in both languages is attributed via the phrase's
 * other words, and a fully ambiguous phrase falls to the active locale — see
 * {@link resolveUnitSource}.
 */
export function applyPartModification(
  text: string,
  part: RangePart,
  action: ModificationAction,
  parts: RangePart[],
  locale?: string
): string | undefined {
  const resolvedLocale = locale ?? i18n.getLocale();
  switch (part.kind) {
    case 'relative-value':
      return modifyRelativeValue(text, part, action);
    case 'relative-direction':
      return modifyRelativeDirection(text, part, action, resolvedLocale);
    case 'relative-unit':
      return modifyRelativeUnit(text, part, action, parts, resolvedLocale);
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
