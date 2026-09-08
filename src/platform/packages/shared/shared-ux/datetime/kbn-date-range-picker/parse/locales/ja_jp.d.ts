import type { LocaleGrammar } from '../locale_grammar';
/**
 * Japanese (`ja-JP`) grammar.
 *
 * Vocabulary drafted by AI assistance, seeded from `moment/locale/ja.js`'s
 * `relativeTime` dictionary (e.g. "%s前"/"%s後" for past/future, "%d日"/"%d分"
 * for day/minute counts — moment's `ja.js` locale data is itself incomplete
 * for weeks, giving untranslated English "a week"/"%d weeks"; NOT used here,
 * "週間" is hand-authored instead), then revised after the first round of
 * native-speaker review on PR #278033. Choices and known limitations:
 *
 * - Like Chinese, Japanese has no singular/plural inflection —
 *   `unitWords.singular`/`.plural` are always identical (linguistically
 *   correct, not a simplification).
 * - `templateWhitespace: 'optional'` — spaces carry no meaning between
 *   Japanese tokens, so every spacing mix of a template parses ("過去7日間",
 *   "過去 7 日間", "過去 7日間"). Templates are authored glued (moment ja's
 *   own "%d日"/"%d分" convention), which is also the generation form.
 * - Delimiters are the wave dash "〜" (U+301C, macOS IMEs), the full-width
 *   tilde "～" (U+FF5E, Windows IMEs) — visually near-identical codepoints,
 *   both commonly used for ranges in everyday Japanese ("1月1日〜1月31日",
 *   store hours, schedules) — and "から" ("from"), validated by native review.
 *   The circumfix "から…まで" is completed by `rangeEndSuffixes`: まで is
 *   stripped from the end side, so "3日前から今" and "3日前から今まで" both
 *   parse.
 * - Bare "月" is NOT a duration alias: "1月" means January — parsing it as
 *   "1 month" would be silently wrong. It lives in `guardWords` instead, so
 *   date-like fragments fail deterministically (localized absolute-date
 *   parsing is deferred). Month counts stay covered by ヶ月 and its
 *   conventional spelling variants (カ/ヵ/か/ケ/箇 — all recognized, ヶ月 is
 *   the generated form). Bare "時" is guarded too: "3時" is 3 o'clock, not a
 *   duration ("時間" covers hour counts).
 * - "日" and "年" ARE unit aliases (the standard instant forms "2日前"/
 *   "2年前" need them) but are `shorthandPrefixRequired`: a bare "22日" reads
 *   as the 22nd and "2025年" as the calendar year (native-review verdict), so
 *   only prefixed shorthand ("-22日") and phrases ("3日前", "過去3日") parse.
 *   The unambiguous duration counters "日間"/"年間" have no such restriction.
 * - Duration display uses the 〜間 counter forms ("過去15分間", "過去7日間",
 *   "過去3年間" — native preference), while instants keep the bare forms
 *   ("15分前", not "15分間前") via `generation.instantUnitWords`.
 * - Past durations recognize ここ/直近 alongside 過去, and future durations
 *   recognize 未来 alongside 今後 (native suggestions); 過去/今後 remain the
 *   generated forms — whether 未来 should replace 今後 in generated text is
 *   an open native-review question.
 */
export declare const JA_JP_GRAMMAR: LocaleGrammar;
