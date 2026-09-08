import type { TimeUnit } from '../types';
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
export type UnitFormOverrides = Partial<Record<TimeUnit, {
    singular?: string;
    plural?: string;
}>>;
export interface LocaleGrammar {
    /** The literal word for "now" recognised in input and used in generated text. */
    nowKeyword: string;
    /** Word delimiters between range sides (the universal dash is added on top, always). */
    delimiters: DelimiterSpec[];
    /** Localized named-range label (lowercased) → bounds. */
    namedRanges: Record<string, {
        start: string;
        end: string;
    }>;
    /** Shorthand mnemonics → canonical named-range key (English only — see "Aliases" note). */
    namedRangeAliases: Record<string, string>;
    /** Every recognised surface form of a unit word → its canonical {@link TimeUnit}. */
    unitAliases: Record<string, TimeUnit>;
    /** Canonical unit → the word used when GENERATING text in this locale. */
    unitWords: Record<TimeUnit, {
        singular: string;
        plural: string;
    }>;
    /** `{count} {unit}`-shaped templates for "last/next N units". */
    durationTemplates: {
        past: string[];
        future: string[];
    };
    /** `{count} {unit}`-shaped templates for "N units ago/from now". */
    instantTemplates: {
        past: string[];
        future: string[];
    };
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
export declare const ENGLISH_GRAMMAR: LocaleGrammar;
/**
 * Returns the raw grammar for `locale` (for GENERATING text in that locale),
 * or {@link ENGLISH_GRAMMAR} if `locale` is unset or unsupported. Unlike
 * {@link getCompiledGrammar}, this is never merged — generated text is always
 * purely one language.
 */
export declare function getActiveGrammar(locale: string | undefined): LocaleGrammar;
export type TemplateSegment = {
    type: 'count';
} | {
    type: 'unit';
} | {
    type: 'literal';
    text: string;
};
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
    namedRanges: Record<string, {
        start: string;
        end: string;
    }>;
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
export declare const escapeRegExp: (input: string) => string;
/**
 * Replaces full-width digits (`７`, U+FF10–U+FF19 — what CJK IMEs produce in
 * full-width mode) with their ASCII equivalents. The replacement is
 * 1:1 in UTF-16 code units, so character offsets into the normalized string
 * are valid in the original (see `parse_range_parts.ts`'s `RangePart` spans).
 * CJK numerals (`七`, `二十`) are out of scope.
 */
export declare const normalizeDigits: (text: string) => string;
/** Builds a regex that splits text on a delimiter, honouring its whitespace mode. */
export declare function buildDelimiterPattern(delimiter: DelimiterSpec): RegExp | null;
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
export declare function findDelimiterSplits(text: string, delimiter: DelimiterSpec): DelimiterSplitCandidate[];
/** Resolves a user-typed unit string through aliases (exact first, then lowercase). */
export declare function resolveUnit(text: string, aliases: Record<string, TimeUnit>): TimeUnit | undefined;
/**
 * The literal words of `grammar`'s duration/instant templates — direction
 * words ("last", "letzte") and instant markers ("ago", "vor", "in") —
 * lowercased. Lets callers attribute an ambiguous unit word (e.g. "minute",
 * valid in both English and German) to the language of the phrase around it;
 * see `resolveUnitSource` in `modify_range_parts.ts`.
 */
export declare function getPhraseWords(grammar: LocaleGrammar): ReadonlySet<string>;
/**
 * Returns the merged (English ⊕ active locale) compiled grammar used for
 * RECOGNIZING input, cached by locale key. English is always included, so
 * English input always parses regardless of which locale is active.
 */
export declare function getCompiledGrammar(locale: string | undefined): CompiledGrammar;
