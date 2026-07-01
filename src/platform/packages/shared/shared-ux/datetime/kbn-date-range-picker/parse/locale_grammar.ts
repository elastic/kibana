/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { NOW_KEYWORD } from '../constants';
import type { TimeUnit } from '../types';
import { DE_DE_GRAMMAR } from './locales/de_de';
import { FR_FR_GRAMMAR } from './locales/fr_fr';

/**
 * The language grammar for natural-language parsing and generation: named
 * ranges, relative-duration/instant phrasing, and word delimiters. Deliberately
 * excludes shorthand datemath, absolute dates, and unix timestamps — those stay
 * English/symbol-invariant (see plan: localized absolute-date parsing is deferred).
 */
export interface LocaleGrammar {
  /** The literal word for "now" recognised in input and used in generated text. */
  nowKeyword: string;
  /** Word delimiters between range sides (the universal dash is added on top, always). */
  delimiters: string[];
  /** Localized named-range label (lowercased) → bounds. */
  namedRanges: Record<string, { start: string; end: string }>;
  /** Shorthand mnemonics → canonical named-range key (English only — see "Aliases" note). */
  namedRangeAliases: Record<string, string>;
  /** Every recognised surface form of a unit word → its canonical {@link TimeUnit}. */
  unitAliases: Record<string, TimeUnit>;
  /** Canonical unit → the word used when GENERATING text in this locale. */
  unitWords: Record<TimeUnit, { singular: string; plural: string }>;
  /** `{count} {unit}`-shaped templates for "last/next N units". */
  durationTemplates: { past: string[]; future: string[] };
  /** `{count} {unit}`-shaped templates for "N units ago/from now". */
  instantTemplates: { past: string[]; future: string[] };
}

// ---------------------------------------------------------------------------
// English grammar — the always-parseable baseline every locale merges with.
// ---------------------------------------------------------------------------

export const ENGLISH_GRAMMAR: LocaleGrammar = {
  nowKeyword: NOW_KEYWORD,
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
  unitWords: {
    ms: { singular: 'millisecond', plural: 'milliseconds' },
    s: { singular: 'second', plural: 'seconds' },
    m: { singular: 'minute', plural: 'minutes' },
    h: { singular: 'hour', plural: 'hours' },
    d: { singular: 'day', plural: 'days' },
    w: { singular: 'week', plural: 'weeks' },
    M: { singular: 'month', plural: 'months' },
    y: { singular: 'year', plural: 'years' },
  },
  durationTemplates: {
    past: ['last {count} {unit}', 'past {count} {unit}'],
    future: ['next {count} {unit}'],
  },
  instantTemplates: {
    past: ['{count} {unit} ago'],
    future: ['{count} {unit} from now', 'in {count} {unit}'],
  },
};

// ---------------------------------------------------------------------------
// Locale registry & resolution
// ---------------------------------------------------------------------------

/**
 * Locale grammars keyed by base language code (e.g. `de`, not `de-DE`).
 * `i18n.getLocale()` lowercases internally, and locale ids may arrive in any
 * casing/region combination, so resolution always normalizes to the bare,
 * lowercased base language — see {@link resolveGrammarKey}.
 */
const LOCALE_GRAMMARS: Record<string, LocaleGrammar> = {
  de: DE_DE_GRAMMAR,
  fr: FR_FR_GRAMMAR,
};

function resolveGrammarKey(locale: string | undefined): string | undefined {
  if (!locale) return undefined;
  const base = locale.toLowerCase().split('-')[0];
  return base in LOCALE_GRAMMARS ? base : undefined;
}

/**
 * Returns the raw grammar for `locale` (for GENERATING text in that locale),
 * or {@link ENGLISH_GRAMMAR} if `locale` is unset or unsupported. Unlike
 * {@link getCompiledGrammar}, this is never merged — generated text is always
 * purely one language.
 */
export function getActiveGrammar(locale: string | undefined): LocaleGrammar {
  const key = resolveGrammarKey(locale);
  return key ? LOCALE_GRAMMARS[key] : ENGLISH_GRAMMAR;
}

// ---------------------------------------------------------------------------
// Compiled (merged) grammar — for RECOGNIZING input. English ⊕ active locale,
// so English is always parseable alongside whichever locale is selected.
// ---------------------------------------------------------------------------

export type TemplateSegment =
  | { type: 'count' }
  | { type: 'unit' }
  | { type: 'literal'; text: string };

export interface CompiledTemplate {
  segments: TemplateSegment[];
  regex: RegExp;
  countGroup: number;
  unitGroup: number;
}

export interface CompiledGrammar {
  shorthandRegex: RegExp;
  durationPast: CompiledTemplate[];
  durationFuture: CompiledTemplate[];
  instantPast: CompiledTemplate[];
  instantFuture: CompiledTemplate[];
  /** Merged word delimiters (English + locale), excluding the universal dash. */
  delimiters: string[];
  /** Precompiled split patterns for `delimiters` plus the universal dash. */
  delimiterPatterns: RegExp[];
  unitAliases: Record<string, TimeUnit>;
  namedRanges: Record<string, { start: string; end: string }>;
  namedRangeAliases: Record<string, string>;
  /** Every recognised "now" literal (English + locale). */
  nowKeywords: string[];
}

/** Escapes regex metacharacters in `input` so it can be embedded verbatim in a pattern. */
export const escapeRegExp = (input: string): string => input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Builds a regex that splits text on a word delimiter surrounded by whitespace. */
export function buildDelimiterPattern(delimiter: string): RegExp | null {
  const trimmed = delimiter.trim();
  return trimmed ? new RegExp(`^(.+?)\\s+${escapeRegExp(trimmed)}\\s+(.+)$`) : null;
}

/**
 * Converts a natural-language template (e.g. `'{count} {unit} ago'`) into a
 * regex, tracking which segments are placeholders vs. literal text. Segments
 * are preserved (not just the compiled regex) so callers can map each matched
 * span back to a character range in the original input — see
 * `parse_range_parts.ts`'s template-driven `RangePart` emission, which reads
 * match positions via the `d` (hasIndices) flag set below rather than
 * re-searching the input for literal text (robust to case/whitespace
 * differences between the template and the actual matched input).
 */
function compileTemplate(template: string, unitPattern: string): CompiledTemplate {
  const parts = template.split(/(\{count}|\{unit})/).filter((part) => part !== '');
  const segments: TemplateSegment[] = [];
  let pattern = '';
  let groupIdx = 0;
  let countGroup = -1;
  let unitGroup = -1;

  for (const part of parts) {
    if (part === '{count}') {
      countGroup = ++groupIdx;
      pattern += '(\\d+)';
      segments.push({ type: 'count' });
    } else if (part === '{unit}') {
      unitGroup = ++groupIdx;
      pattern += `(${unitPattern})`;
      segments.push({ type: 'unit' });
    } else {
      pattern += escapeRegExp(part).replace(/ /g, '\\s+');
      segments.push({ type: 'literal', text: part });
    }
  }

  return { segments, regex: new RegExp(`^${pattern}$`, 'di'), countGroup, unitGroup };
}

/** Resolves a user-typed unit string through aliases (exact first, then lowercase). */
export function resolveUnit(text: string, aliases: Record<string, TimeUnit>): TimeUnit | undefined {
  return aliases[text] ?? aliases[text.toLowerCase()];
}

const compiledCache = new Map<string, CompiledGrammar>();

function compileMergedGrammar(locale: LocaleGrammar | undefined): CompiledGrammar {
  const unitAliases = locale
    ? { ...ENGLISH_GRAMMAR.unitAliases, ...locale.unitAliases }
    : ENGLISH_GRAMMAR.unitAliases;
  const namedRanges = locale
    ? { ...ENGLISH_GRAMMAR.namedRanges, ...locale.namedRanges }
    : ENGLISH_GRAMMAR.namedRanges;
  const namedRangeAliases = locale
    ? { ...ENGLISH_GRAMMAR.namedRangeAliases, ...locale.namedRangeAliases }
    : ENGLISH_GRAMMAR.namedRangeAliases;
  const delimiters = locale
    ? Array.from(new Set([...ENGLISH_GRAMMAR.delimiters, ...locale.delimiters]))
    : ENGLISH_GRAMMAR.delimiters;
  const nowKeywords = locale
    ? Array.from(new Set([ENGLISH_GRAMMAR.nowKeyword, locale.nowKeyword]))
    : [ENGLISH_GRAMMAR.nowKeyword];

  const unitPattern = Object.keys(unitAliases)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');

  const concatPast = locale
    ? [...ENGLISH_GRAMMAR.durationTemplates.past, ...locale.durationTemplates.past]
    : ENGLISH_GRAMMAR.durationTemplates.past;
  const concatFuture = locale
    ? [...ENGLISH_GRAMMAR.durationTemplates.future, ...locale.durationTemplates.future]
    : ENGLISH_GRAMMAR.durationTemplates.future;
  const instantPast = locale
    ? [...ENGLISH_GRAMMAR.instantTemplates.past, ...locale.instantTemplates.past]
    : ENGLISH_GRAMMAR.instantTemplates.past;
  const instantFuture = locale
    ? [...ENGLISH_GRAMMAR.instantTemplates.future, ...locale.instantTemplates.future]
    : ENGLISH_GRAMMAR.instantTemplates.future;

  const delimiterPatterns = [...delimiters, '-']
    .map(buildDelimiterPattern)
    .filter((p): p is RegExp => p !== null);

  return {
    shorthandRegex: new RegExp(`^(now)?([+-]?)(\\d+)(${unitPattern})(\\/[smhdwMy])?$`),
    durationPast: concatPast.map((t) => compileTemplate(t, unitPattern)),
    durationFuture: concatFuture.map((t) => compileTemplate(t, unitPattern)),
    instantPast: instantPast.map((t) => compileTemplate(t, unitPattern)),
    instantFuture: instantFuture.map((t) => compileTemplate(t, unitPattern)),
    delimiters,
    delimiterPatterns,
    unitAliases,
    namedRanges,
    namedRangeAliases,
    nowKeywords,
  };
}

/**
 * Returns the merged (English ⊕ active locale) compiled grammar used for
 * RECOGNIZING input, cached by locale key. English is always included, so
 * English input always parses regardless of which locale is active.
 */
export function getCompiledGrammar(locale: string | undefined): CompiledGrammar {
  const key = resolveGrammarKey(locale) ?? 'en';
  let compiled = compiledCache.get(key);
  if (!compiled) {
    compiled = compileMergedGrammar(key === 'en' ? undefined : LOCALE_GRAMMARS[key]);
    compiledCache.set(key, compiled);
  }
  return compiled;
}
