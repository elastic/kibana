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
 * "週間" is hand-authored instead). **Needs native-speaker /
 * localization-team review before this is considered linguistically
 * correct** — known choices and simplifications:
 *
 * - Like Chinese, Japanese has no singular/plural inflection —
 *   `unitWords.singular`/`.plural` are always identical (linguistically
 *   correct, not a simplification).
 * - Templates are authored GLUED first ("過去7日間", matching
 *   `moment/locale/ja.js`'s own glued convention "%d日"/"%d分" — the
 *   generation form), with spaced variants accepted for recognition.
 * - Delimiters are the wave dash "〜" (U+301C, macOS IMEs) and the full-width
 *   tilde "～" (U+FF5E, Windows IMEs) — visually near-identical codepoints,
 *   both commonly used for ranges in everyday Japanese (e.g. "1月1日〜1月31日",
 *   store hours, schedules) — recognized with optional surrounding whitespace.
 *   The more formal circumfix construction "から…まで" ("from…to", wrapping
 *   both sides) is NOT supported — deferred; "〜"/"～" are expected to cover
 *   casual/UI input. This is the assumption most in need of native-speaker
 *   validation.
 * - Bare "月" is deliberately NOT a duration alias: "1月" means January —
 *   parsing it as "1 month" would be silently wrong. It lives in `guardWords`
 *   instead, so date-like fragments fail deterministically (localized
 *   absolute-date parsing is deferred). Month counts stay covered by
 *   "ヶ月"/"カ月". Bare "日" IS kept ("2日前" is the standard way to say
 *   "2 days ago"), which means a bare "22日" (the 22nd) parses as 22 days —
 *   a known ambiguity flagged for native review.
 * - "過去"/"今後" (past/future duration) and unit words like "ヶ月" (there are
 *   multiple conventional ways to write "months": ヶ月/カ月/箇月) are
 *   reasonable but not verified as the most natural phrasing.
 */
export const JA_JP_GRAMMAR: LocaleGrammar = {
  nowKeyword: '今',
  delimiters: [
    { text: '〜', whitespace: 'optional' },
    { text: '～', whitespace: 'optional' },
  ],
  namedRanges: {
    今日: { start: 'now/d', end: 'now/d' },
    昨日: { start: 'now-1d/d', end: 'now-1d/d' },
    明日: { start: 'now+1d/d', end: 'now+1d/d' },
    今週: { start: 'now/w', end: 'now/w' },
    今月: { start: 'now/M', end: 'now/M' },
    今年: { start: 'now/y', end: 'now/y' },
    先週: { start: 'now-1w/w', end: 'now-1w/w' },
    先月: { start: 'now-1M/M', end: 'now-1M/M' },
    去年: { start: 'now-1y/y', end: 'now-1y/y' },
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
    時間: 'h',
    日間: 'd',
    日: 'd',
    週間: 'w',
    週: 'w',
    ヶ月: 'M',
    カ月: 'M',
    年: 'y',
  },
  // Date-language words that must REJECT rather than parse — see the "月"
  // note in the header comment.
  guardWords: ['月'],
  unitWords: {
    ms: { singular: 'ミリ秒', plural: 'ミリ秒' },
    s: { singular: '秒', plural: '秒' },
    m: { singular: '分', plural: '分' },
    h: { singular: '時間', plural: '時間' },
    // Bare "日" (not "日間"), matching moment/locale/ja.js's own "%d日" — "日間"
    // is still recognized as an input alias.
    d: { singular: '日', plural: '日' },
    w: { singular: '週間', plural: '週間' },
    M: { singular: 'ヶ月', plural: 'ヶ月' },
    y: { singular: '年', plural: '年' },
  },
  durationTemplates: {
    // Glued first (the generation form, moment ja's own convention), spaced
    // second (recognition only). Past/future lists stay index-aligned for
    // direction-flip stepping (過去 ↔ 今後).
    past: ['過去{count}{unit}', '過去 {count} {unit}'],
    future: ['今後{count}{unit}', '今後 {count} {unit}'],
  },
  instantTemplates: {
    // Aligned with moment/locale/ja.js's own `past: '%s前'` / `future: '%s後'`.
    past: ['{count}{unit}前', '{count} {unit}前'],
    future: ['{count}{unit}後', '{count} {unit}後'],
  },
};
