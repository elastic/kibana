import type { LocaleGrammar } from '../locale_grammar';
/**
 * Simplified Chinese (`zh-CN`) grammar.
 *
 * Vocabulary drafted by AI assistance, seeded from `moment/locale/zh-cn.js`'s
 * `relativeTime` dictionary (e.g. "%s前"/"%s后" for past/future,
 * "%d 天"/"%d 分钟" for day/minute counts), then revised after the first round
 * of native-speaker review on PR #278033. Choices and known limitations:
 *
 * - Chinese has no singular/plural inflection, so `unitWords.singular` and
 *   `.plural` are always identical — this is linguistically correct, not a
 *   simplification (confirmed against moment's own data: "1 天" / "%d 天"
 *   use the same word "天" regardless of count).
 * - `templateWhitespace: 'optional'` — spaces carry no meaning between
 *   Chinese tokens (and IMEs make mixed spacing common), so every spacing mix
 *   of a template parses ("最近 7 天", "最近7天", "最近 7天", "最近7 天").
 *   Templates are authored SPACED (moment zh-CN's own "%d 天" convention),
 *   which is also the generation form.
 * - Delimiters ("到", "至", and both tilde codepoints) are recognized with
 *   optional surrounding whitespace (Chinese text has no inter-word spacing),
 *   matching how a date range like "1月22日到1月23日" is commonly written.
 * - Bare "月"/"日" are deliberately NOT duration aliases: "1月" means January
 *   and "22日" means the 22nd — parsing them as "1 month"/"22 days" would be
 *   silently wrong. They live in `guardWords` instead, so date-like fragments
 *   fail deterministically (localized absolute-date parsing is deferred).
 *   Month/day counts stay covered by "个月"/"天"; the literary "3日前" is a
 *   known casualty (use "3天前") — confirmed acceptable by native review.
 * - "年" IS a unit alias (needed for "3年前"/"最近 3 年") but is
 *   `shorthandPrefixRequired`: a bare "2025年" reads as the calendar year,
 *   not "2025 years" (same native-review verdict as Japanese 22日/2025年), so
 *   only prefixed shorthand ("-3年") and phrases parse.
 * - The measure word "个" is recognized where it is idiomatic: 个月, 个小时,
 *   个星期 (native suggestion). Units like 天/年/分钟 don't take 个.
 * - "最近"/"过去" (past) and "未来"/"接下来" (future) are reasonable but not
 *   verified as the most natural phrasing for a dashboard/UI register.
 */
export declare const ZH_CN_GRAMMAR: LocaleGrammar;
