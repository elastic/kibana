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
import { JA_JP_GRAMMAR } from './locales/ja_jp';
import { ZH_CN_GRAMMAR } from './locales/zh_cn';

/**
 * A range delimiter recognised between the two sides of a typed range.
 */
export interface DelimiterSpec {
  text: string;
  /**
   * Whether the delimiter needs surrounding whitespace to split.
   * - `'required'` (default) — word delimiters ("to", "bis"): without this,
   *   "to" would match inside "october".
   * - `'optional'` — CJK symbol delimiters ("到", "〜"): CJK text has no
   *   inter-word spacing ("1月22日到1月23日"). Never use for alphabetic
   *   delimiters.
   */
  whitespace?: 'required' | 'optional';
}

/**
 * The language grammar for natural-language parsing and generation: named
 * ranges, relative-duration/instant phrasing, and word delimiters. Deliberately
 * excludes shorthand datemath, absolute dates, and unix timestamps — those stay
 * English/symbol-invariant (see plan: localized absolute-date parsing is deferred).
 */
/** Per-unit, per-plurality override map used by {@link LocaleGrammar.generation}. */
export type UnitFormOverrides = Partial<Record<TimeUnit, { singular?: string; plural?: string }>>;

export interface LocaleGrammar {
  /** The literal word for "now" recognised in input and used in generated text. */
  nowKeyword: string;
  /** Word delimiters between range sides (the universal dash is added on top, always). */
  delimiters: DelimiterSpec[];
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
  /**
   * Words that look date-related but should make parsing fail instead of
   * falling back to absolute-date parsing. Mainly for ambiguous CJK cases
   * like `月`, where `1月` likely means “January”, not “1 month”.
   */
  guardWords?: string[];
  /**
   * Unit forms that are only allowed in shorthand relative syntax when
   * there is an explicit `now`, `+`, or `-`. Example: bare `22日` should
   * not mean “22 days”; but `-22日` or `now-22日` is clearly relative.
   */
  shorthandPrefixRequired?: string[];
  /**
   * How whitespace in `durationTemplates`/`instantTemplates` is matched when
   * RECOGNIZING input. `'required'` (default) compiles template spaces to
   * `\s+`, keeping word-language templates strict ("last7days" must not
   * parse). `'optional'` — for CJK locales, where spaces carry no meaning
   * between tokens — tolerates whitespace between ALL template segments, so a
   * single authored template accepts every spacing mix an IME produces
   * ("最近 7 天", "最近7天", "最近 7天", "最近7 天"). Generation always uses
   * the template text verbatim.
   */
  templateWhitespace?: 'required' | 'optional';
  /**
   * Additional words recognised as "now" on input (e.g. Japanese 現在
   * alongside 今). Generated text always uses `nowKeyword`.
   */
  nowAliases?: string[];
  /**
   * Suffix words stripped from the END side of a delimited range before that
   * side is parsed.
   */
  rangeEndSuffixes?: string[];
  // TODO: rename — bare `generation` reads like a version counter rather than an
  // exception layer applied when generating text.
  /**
   * Grammatical-agreement overrides applied only when GENERATING text.
   * Parsing is unaffected — every accepted surface form belongs in
   * `durationTemplates`/`unitAliases` instead. Each override MUST therefore
   * also be parseable through those fields, or generated text stops
   * round-tripping (the corpus suite proves this).
   */
  generation?: {
    /**
     * Replaces `durationTemplates.past[0]` for specific units when the
     * direction word inflects (e.g. French feminine "dernières {count} {unit}",
     * German masculine singular "letzter {count} {unit}").
     */
    durationPast?: UnitFormOverrides;
    /** Same as `durationPast`, for `durationTemplates.future[0]`. */
    durationFuture?: UnitFormOverrides;
    /**
     * Replaces the `unitWords` entry inside generated INSTANT phrases when the
     * unit word inflects after the template's preposition (e.g. German dative
     * "vor 15 Tagen", not nominative "Tage").
     */
    instantUnitWords?: UnitFormOverrides;
  };
}

// ---------------------------------------------------------------------------
// English grammar — the always-parseable baseline every locale merges with.
// ---------------------------------------------------------------------------

export const ENGLISH_GRAMMAR: LocaleGrammar = {
  nowKeyword: NOW_KEYWORD,
  delimiters: [{ text: 'to' }, { text: 'until' }],
  namedRanges: {
    today: { start: 'now/d', end: 'now/d' },
    yesterday: { start: 'now-1d/d', end: 'now-1d/d' },
    tomorrow: { start: 'now+1d/d', end: 'now+1d/d' },
    'this week': { start: 'now/w', end: 'now/w' },
    'this week until now': { start: 'now/w', end: 'now' },
    'this month': { start: 'now/M', end: 'now/M' },
    'this month until now': { start: 'now/M', end: 'now' },
    'this year': { start: 'now/y', end: 'now/y' },
    'this year until now': { start: 'now/y', end: 'now' },
    'last week': { start: 'now-1w/w', end: 'now-1w/w' },
    'last month': { start: 'now-1M/M', end: 'now-1M/M' },
    'last year': { start: 'now-1y/y', end: 'now-1y/y' },
    'next week': { start: 'now+1w/w', end: 'now+1w/w' },
    'next month': { start: 'now+1M/M', end: 'now+1M/M' },
    'next year': { start: 'now+1y/y', end: 'now+1y/y' },
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
  ja: JA_JP_GRAMMAR,
  zh: ZH_CN_GRAMMAR,
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
  delimiters: DelimiterSpec[];
  /** Precompiled split patterns for `delimiters` plus the universal dash. */
  delimiterPatterns: RegExp[];
  unitAliases: Record<string, TimeUnit>;
  namedRanges: Record<string, { start: string; end: string }>;
  namedRangeAliases: Record<string, string>;
  /** Every recognised "now" literal (English + locale, including `nowAliases`). */
  nowKeywords: string[];
  /** Locale suffixes stripped from the END side of a delimited range ("まで"). */
  rangeEndSuffixes: readonly string[];
  /** Surface unit forms whose shorthand needs a now/sign prefix — see {@link LocaleGrammar.shorthandPrefixRequired}. */
  shorthandPrefixRequired: ReadonlySet<string>;
  /**
   * Every natural-language word this grammar recognises — unit aliases,
   * duration/instant template words, and "now" keywords — lowercased. A
   * fragment containing one of these words but failing every phrase template
   * is a FAILED PHRASE, not an absolute date; `parse_text.ts` uses this to
   * keep the forgiving absolute-date fallback from misreading such fragments
   * (e.g. "5 minutes to spare" would otherwise parse as May 1).
   */
  vocabulary: ReadonlySet<string>;
  /**
   * The subset of `vocabulary` (plus the grammar's `guardWords`) written in a
   * CJK script. Checked by SUBSTRING containment instead of standalone-word
   * lookup: CJK text has no inter-word spacing, so a failed glued phrase like
   * "最近7天啊" never splits into a matchable standalone word — without this,
   * it would fall through to the forgiving absolute-date fallback.
   */
  cjkVocabulary: readonly string[];
}

/** Escapes regex metacharacters in `input` so it can be embedded verbatim in a pattern. */
export const escapeRegExp = (input: string): string => input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const FULLWIDTH_DIGIT_RE = /[０-９]/g;

/**
 * Replaces full-width digits (`７`, U+FF10–U+FF19 — what CJK IMEs produce in
 * full-width mode) with their ASCII equivalents. The replacement is
 * 1:1 in UTF-16 code units, so character offsets into the normalized string
 * are valid in the original (see `parse_range_parts.ts`'s `RangePart` spans).
 * CJK numerals (`七`, `二十`) are out of scope.
 */
export const normalizeDigits = (text: string): string =>
  text.replace(FULLWIDTH_DIGIT_RE, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xfee0));

/** De-duplicates delimiter specs by `text`, keeping the first occurrence (English wins ties). */
const dedupeDelimiters = (specs: DelimiterSpec[]): DelimiterSpec[] => {
  const seen = new Set<string>();
  return specs.filter((spec) => {
    if (seen.has(spec.text)) return false;
    seen.add(spec.text);
    return true;
  });
};

/** Builds a regex that splits text on a delimiter, honouring its whitespace mode. */
export function buildDelimiterPattern(delimiter: DelimiterSpec): RegExp | null {
  const trimmed = delimiter.text.trim();
  const ws = delimiter.whitespace === 'optional' ? '\\s*' : '\\s+';
  return trimmed ? new RegExp(`^(.+?)${ws}${escapeRegExp(trimmed)}${ws}(.+)$`) : null;
}

/** One possible way to split a text on a delimiter occurrence. */
export interface DelimiterSplitCandidate {
  left: string;
  right: string;
  /** Index in the source text where the right side begins (after the delimiter's trailing whitespace). */
  rightOffset: number;
  /** Span of the delimiter word itself (excluding surrounding whitespace) in the source text. */
  delimiterStart: number;
  delimiterEnd: number;
}

/**
 * Enumerates every position where `delimiter` (with non-blank text on both
 * sides, and surrounding whitespace per its `whitespace` mode) could split
 * `text`, left to right. Callers must try candidates until one produces two
 * parseable sides rather than trusting the first occurrence: a delimiter word
 * can also appear INSIDE a natural-language phrase — French's accent-less
 * delimiter `a` is a substring of the instant phrase "il y a 3 jours", so in
 * `"il y a 3 jours a il y a 2 jours"` only the middle occurrence is a real
 * range delimiter.
 */
export function findDelimiterSplits(
  text: string,
  delimiter: DelimiterSpec
): DelimiterSplitCandidate[] {
  const trimmedDelimiter = delimiter.text.trim();
  if (!trimmedDelimiter) return [];

  const ws = delimiter.whitespace === 'optional' ? '\\s*' : '\\s+';
  const pattern = new RegExp(`${ws}${escapeRegExp(trimmedDelimiter)}${ws}`, 'g');
  const candidates: DelimiterSplitCandidate[] = [];

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    const left = text.slice(0, index);
    const rightOffset = index + match[0].length;
    const right = text.slice(rightOffset);
    if (!left.trim() || !right.trim()) continue;

    const delimiterStart = index + match[0].indexOf(trimmedDelimiter);
    candidates.push({
      left,
      right,
      rightOffset,
      delimiterStart,
      delimiterEnd: delimiterStart + trimmedDelimiter.length,
    });
  }

  return candidates;
}

/**
 * The `{unit}` placeholder matches ANY word (Unicode letters + combining
 * marks), NOT the strict unit-alias alternation. Whether the captured word is
 * a real unit is validated AFTER matching (`resolveUnit`), exactly like the
 * `{count}`-adjacent lookups in `parse_text.ts` and `modify_range_parts.ts` —
 * both no-op gracefully on an unknown word. Keeping the regex lenient means a
 * mistyped unit ("last 7 dayz") still matches the template shape, so
 * `parse_range_parts.ts` still emits the correctly-typed parts for arrow-key
 * navigation instead of losing the whole phrase.
 */
const LENIENT_UNIT_PATTERN = '[\\p{L}\\p{M}]+';

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
function compileTemplate(
  template: string,
  whitespace: 'required' | 'optional' = 'required'
): CompiledTemplate {
  const parts = template.split(/(\{count}|\{unit})/).filter((part) => part !== '');
  const segments: TemplateSegment[] = [];
  // 'optional' additionally tolerates whitespace at every segment boundary
  // (not just where the template has a space): CJK input mixes spaced and
  // glued forms freely ("最近 7天", "3天 前"), and no boundary is ambiguous —
  // counts are digits, units are letters, literals are fixed words.
  const ws = whitespace === 'optional' ? '\\s*' : '\\s+';
  const glue = whitespace === 'optional' ? '\\s*' : '';
  let pattern = '';
  let groupIdx = 0;
  let countGroup = -1;
  let unitGroup = -1;

  for (const part of parts) {
    const joiner = pattern ? glue : '';
    if (part === '{count}') {
      countGroup = ++groupIdx;
      pattern += `${joiner}(\\d+)`;
      segments.push({ type: 'count' });
    } else if (part === '{unit}') {
      unitGroup = ++groupIdx;
      pattern += `${joiner}(${LENIENT_UNIT_PATTERN})`;
      segments.push({ type: 'unit' });
    } else {
      pattern += joiner + escapeRegExp(part).replace(/ /g, ws);
      segments.push({ type: 'literal', text: part });
    }
  }

  return { segments, regex: new RegExp(`^${pattern}$`, 'diu'), countGroup, unitGroup };
}

/** Resolves a user-typed unit string through aliases (exact first, then lowercase). */
export function resolveUnit(text: string, aliases: Record<string, TimeUnit>): TimeUnit | undefined {
  return aliases[text] ?? aliases[text.toLowerCase()];
}

/** Lowercased literal words of a `{count} {unit}` template (e.g. "vor", "from", "now"). */
const extractTemplateWords = (template: string): string[] =>
  template
    .replace(/\{count}|\{unit}/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

const phraseWordsCache = new WeakMap<LocaleGrammar, ReadonlySet<string>>();

/**
 * The literal words of `grammar`'s duration/instant templates — direction
 * words ("last", "letzte") and instant markers ("ago", "vor", "in") —
 * lowercased. Lets callers attribute an ambiguous unit word (e.g. "minute",
 * valid in both English and German) to the language of the phrase around it;
 * see `resolveUnitSource` in `modify_range_parts.ts`.
 */
export function getPhraseWords(grammar: LocaleGrammar): ReadonlySet<string> {
  const cached = phraseWordsCache.get(grammar);
  if (cached) return cached;

  const words = new Set(
    [
      ...grammar.durationTemplates.past,
      ...grammar.durationTemplates.future,
      ...grammar.instantTemplates.past,
      ...grammar.instantTemplates.future,
    ].flatMap(extractTemplateWords)
  );
  phraseWordsCache.set(grammar, words);
  return words;
}

/** Matches any Han/kana codepoint — the scripts whose vocabulary needs substring matching. */
const CJK_SCRIPT_RE = /[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}]/u;

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
    ? dedupeDelimiters([...ENGLISH_GRAMMAR.delimiters, ...locale.delimiters])
    : ENGLISH_GRAMMAR.delimiters;
  const nowKeywords = locale
    ? Array.from(
        new Set([ENGLISH_GRAMMAR.nowKeyword, locale.nowKeyword, ...(locale.nowAliases ?? [])])
      )
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

  // Templates compile with their SOURCE grammar's whitespace mode: English
  // stays strict even when merged under a CJK locale.
  const localeWhitespace = locale?.templateWhitespace ?? 'required';
  const compileMergedTemplates = (english: string[], localeTemplates: string[] | undefined) => [
    ...english.map((template) => compileTemplate(template)),
    ...(localeTemplates ?? []).map((template) => compileTemplate(template, localeWhitespace)),
  ];

  const delimiterPatterns = [...delimiters, { text: '-' }]
    .map(buildDelimiterPattern)
    .filter((p): p is RegExp => p !== null);

  const vocabularyWords = [
    ...Object.keys(unitAliases).map((alias) => alias.toLowerCase()),
    ...nowKeywords,
    ...[...concatPast, ...concatFuture, ...instantPast, ...instantFuture].flatMap(
      extractTemplateWords
    ),
    ...(locale?.guardWords ?? []).map((word) => word.toLowerCase()),
    ...(locale?.rangeEndSuffixes ?? []).map((word) => word.toLowerCase()),
  ];
  const vocabulary = new Set(vocabularyWords);
  const cjkVocabulary = Array.from(
    new Set(vocabularyWords.filter((word) => CJK_SCRIPT_RE.test(word)))
  );

  return {
    shorthandRegex: new RegExp(`^(now)?([+-]?)(\\d+)(${unitPattern})(\\/[smhdwMy])?$`),
    durationPast: compileMergedTemplates(
      ENGLISH_GRAMMAR.durationTemplates.past,
      locale?.durationTemplates.past
    ),
    durationFuture: compileMergedTemplates(
      ENGLISH_GRAMMAR.durationTemplates.future,
      locale?.durationTemplates.future
    ),
    instantPast: compileMergedTemplates(
      ENGLISH_GRAMMAR.instantTemplates.past,
      locale?.instantTemplates.past
    ),
    instantFuture: compileMergedTemplates(
      ENGLISH_GRAMMAR.instantTemplates.future,
      locale?.instantTemplates.future
    ),
    delimiters,
    delimiterPatterns,
    unitAliases,
    namedRanges,
    namedRangeAliases,
    nowKeywords,
    rangeEndSuffixes: locale?.rangeEndSuffixes ?? [],
    shorthandPrefixRequired: new Set(locale?.shorthandPrefixRequired ?? []),
    vocabulary,
    cjkVocabulary,
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
