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
 * Simplified Chinese (`zh-CN`) grammar.
 *
 * Vocabulary drafted by AI assistance, seeded from `moment/locale/zh-cn.js`'s
 * `relativeTime` dictionary (e.g. "%s前"/"%s后" for past/future,
 * "%d 天"/"%d 分钟" for day/minute counts). **Needs native-speaker /
 * localization-team review before this is considered linguistically
 * correct** — known choices and simplifications:
 *
 * - Chinese has no singular/plural inflection, so `unitWords.singular` and
 *   `.plural` are always identical — this is linguistically correct, not a
 *   simplification (confirmed against moment's own data: "1 天" / "%d 天"
 *   use the same word "天" regardless of count).
 * - Templates are authored in BOTH spaced and glued forms ("最近 7 天" and
 *   "最近7天") — the spaced form matches moment's own zh-CN convention
 *   ("%d 天") and comes first, so generated text is spaced; the glued form
 *   matches how ranges are commonly typed.
 * - Delimiters ("到", "至", and both tilde codepoints) are recognized with
 *   optional surrounding whitespace (Chinese text has no inter-word spacing),
 *   matching how a date range like "1月22日到1月23日" is commonly written.
 * - Bare "月"/"日" are deliberately NOT duration aliases: "1月" means January
 *   and "22日" means the 22nd — parsing them as "1 month"/"22 days" would be
 *   silently wrong. They live in `guardWords` instead, so date-like fragments
 *   fail deterministically (localized absolute-date parsing is deferred).
 *   Month/day counts stay covered by "个月"/"天"; the literary "3日前" is a
 *   known casualty (use "3天前").
 * - "最近"/"过去" (past) and "未来"/"接下来" (future) are reasonable but not
 *   verified as the most natural phrasing for a dashboard/UI register.
 */
export const ZH_CN_GRAMMAR: LocaleGrammar = {
  nowKeyword: '现在',
  delimiters: [
    { text: '到', whitespace: 'optional' },
    { text: '至', whitespace: 'optional' },
    // Both tilde codepoints: full-width tilde (U+FF5E, Windows IMEs) and
    // wave dash (U+301C, macOS IMEs) — visually near-identical, both used.
    { text: '～', whitespace: 'optional' },
    { text: '〜', whitespace: 'optional' },
  ],
  namedRanges: {
    今天: { start: 'now/d', end: 'now/d' },
    昨天: { start: 'now-1d/d', end: 'now-1d/d' },
    明天: { start: 'now+1d/d', end: 'now+1d/d' },
    本周: { start: 'now/w', end: 'now/w' },
    这周: { start: 'now/w', end: 'now/w' },
    本月: { start: 'now/M', end: 'now/M' },
    这个月: { start: 'now/M', end: 'now/M' },
    今年: { start: 'now/y', end: 'now/y' },
    上周: { start: 'now-1w/w', end: 'now-1w/w' },
    上个月: { start: 'now-1M/M', end: 'now-1M/M' },
    上月: { start: 'now-1M/M', end: 'now-1M/M' },
    去年: { start: 'now-1y/y', end: 'now-1y/y' },
    下周: { start: 'now+1w/w', end: 'now+1w/w' },
    下个月: { start: 'now+1M/M', end: 'now+1M/M' },
    明年: { start: 'now+1y/y', end: 'now+1y/y' },
  },
  // No localized aliases — `td`/`yd`/`tmr` are English mnemonics; we don't
  // invent equivalents unless a locale clearly wants them.
  namedRangeAliases: {},
  unitAliases: {
    毫秒: 'ms',
    秒: 's',
    分钟: 'm',
    分: 'm',
    小时: 'h',
    天: 'd',
    周: 'w',
    星期: 'w',
    个月: 'M',
    年: 'y',
  },
  // Date-language words that must REJECT rather than parse — see the "月"/"日"
  // note in the header comment ("号" is the colloquial day-of-month counter).
  guardWords: ['月', '日', '号'],
  unitWords: {
    ms: { singular: '毫秒', plural: '毫秒' },
    s: { singular: '秒', plural: '秒' },
    m: { singular: '分钟', plural: '分钟' },
    h: { singular: '小时', plural: '小时' },
    d: { singular: '天', plural: '天' },
    w: { singular: '周', plural: '周' },
    M: { singular: '个月', plural: '个月' },
    y: { singular: '年', plural: '年' },
  },
  durationTemplates: {
    // Spaced first (the generation form, moment zh-CN's own convention),
    // glued second (recognition only). Past/future lists stay index-aligned
    // for direction-flip stepping (最近 ↔ 未来, 过去 ↔ 接下来).
    past: ['最近 {count} {unit}', '过去 {count} {unit}', '最近{count}{unit}', '过去{count}{unit}'],
    future: [
      '未来 {count} {unit}',
      '接下来 {count} {unit}',
      '未来{count}{unit}',
      '接下来{count}{unit}',
    ],
  },
  instantTemplates: {
    // Aligned with moment/locale/zh-cn.js's own `past: '%s前'` / `future: '%s后'`
    // with `s: '%d 天'` — spaced between count and unit, glued before 前/后.
    past: ['{count} {unit}前', '{count}{unit}前'],
    future: ['{count} {unit}后', '{count}{unit}后'],
  },
};
