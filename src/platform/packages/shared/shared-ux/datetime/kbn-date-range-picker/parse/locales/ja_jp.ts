/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
export const JA_JP_GRAMMAR: LocaleGrammar = {
  nowKeyword: '今',
  nowAliases: ['現在'],
  delimiters: [
    { text: '〜', whitespace: 'optional' },
    { text: '～', whitespace: 'optional' },
    { text: 'から', whitespace: 'optional' },
  ],
  rangeEndSuffixes: ['まで'],
  namedRanges: {
    今日: { start: 'now/d', end: 'now/d' },
    昨日: { start: 'now-1d/d', end: 'now-1d/d' },
    一昨日: { start: 'now-2d/d', end: 'now-2d/d' },
    明日: { start: 'now+1d/d', end: 'now+1d/d' },
    明後日: { start: 'now+2d/d', end: 'now+2d/d' },
    今週: { start: 'now/w', end: 'now/w' },
    今月: { start: 'now/M', end: 'now/M' },
    今年: { start: 'now/y', end: 'now/y' },
    先週: { start: 'now-1w/w', end: 'now-1w/w' },
    先月: { start: 'now-1M/M', end: 'now-1M/M' },
    // Both registers parse (去年 everyday, 昨年 business formal); the picker
    // echoes back whichever the user typed.
    去年: { start: 'now-1y/y', end: 'now-1y/y' },
    昨年: { start: 'now-1y/y', end: 'now-1y/y' },
    来週: { start: 'now+1w/w', end: 'now+1w/w' },
    来月: { start: 'now+1M/M', end: 'now+1M/M' },
    来年: { start: 'now+1y/y', end: 'now+1y/y' },
  },
  // No localized aliases — `td`/`yd`/`tmr` are English mnemonics; we don't
  // invent equivalents unless a locale clearly wants them.
  namedRangeAliases: {},
  unitAliases: {
    ミリ秒: 'ms',
    秒: 's',
    分: 'm',
    分間: 'm',
    時間: 'h',
    日間: 'd',
    日: 'd',
    週間: 'w',
    週: 'w',
    ヶ月: 'M',
    カ月: 'M',
    ヵ月: 'M',
    か月: 'M',
    ケ月: 'M',
    箇月: 'M',
    年間: 'y',
    年: 'y',
  },
  // Date-language words that must REJECT rather than parse — see the "月"/"時"
  // notes in the header comment.
  guardWords: ['月', '時'],
  // Bare "22日"/"2025年" are calendar dates, not durations — see header.
  shorthandPrefixRequired: ['日', '年'],
  templateWhitespace: 'optional',
  unitWords: {
    ms: { singular: 'ミリ秒', plural: 'ミリ秒' },
    s: { singular: '秒', plural: '秒' },
    // 〜間 counter forms for the units where bare words read as calendar
    // dates/clock points — native preference for duration labels ("過去15分間").
    // Instants override back to the bare forms below ("15分前").
    m: { singular: '分間', plural: '分間' },
    h: { singular: '時間', plural: '時間' },
    d: { singular: '日間', plural: '日間' },
    w: { singular: '週間', plural: '週間' },
    M: { singular: 'ヶ月', plural: 'ヶ月' },
    y: { singular: '年間', plural: '年間' },
  },
  durationTemplates: {
    // Glued (the generation form, moment ja's own convention) — spacing mixes
    // are covered by `templateWhitespace: 'optional'`. Past/future lists stay
    // index-aligned for direction-flip stepping (過去 ↔ 今後, ここ ↔ 未来);
    // 直近 falls back to 今後 when flipped forward.
    past: ['過去{count}{unit}', 'ここ{count}{unit}', '直近{count}{unit}'],
    future: ['今後{count}{unit}', '未来{count}{unit}'],
  },
  instantTemplates: {
    // Aligned with moment/locale/ja.js's own `past: '%s前'` / `future: '%s後'`.
    past: ['{count}{unit}前'],
    future: ['{count}{unit}後'],
  },
  generation: {
    // Instants use the bare unit words: "15分前" / "3日前" / "2年前" — the
    // 〜間 duration counters above would be wrong here ("15分間前" is not
    // Japanese). Both forms parse; this only affects generated text.
    instantUnitWords: {
      m: { singular: '分', plural: '分' },
      d: { singular: '日', plural: '日' },
      y: { singular: '年', plural: '年' },
    },
  },
};
