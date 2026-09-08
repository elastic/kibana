import type { LocaleGrammar } from '../locale_grammar';
/**
 * German (`de-DE`) grammar.
 *
 * Vocabulary drafted by AI assistance, seeded from `moment/locale/de.js`'s
 * `relativeTime` dictionary where it covers a unit (e.g. "Tag"/"Tage",
 * "Minute"/"Minuten"). Gaps (named ranges, delimiter, templates) filled by
 * hand, then refined with native-speaker review feedback:
 *
 * - Named ranges accept both nominative and accusative masculine forms
 *   ("dieser"/"diesen Monat", "letzter"/"letzten Monat").
 * - Duration templates accept every adjective ending ("letzte 7 Tage",
 *   "letzter 1 Tag", "letztes 1 Jahr", "letzten 30 Tagen"); `generation`
 *   picks the gender-correct singular form ("Letzter 1 Tag" for the
 *   masculine "Tag"/"Monat", "Letztes 1 Jahr" for the neuter "Jahr").
 * - Instant phrases take the dative after "vor"/"in", which inflects the
 *   plural of Tag/Monat/Jahr ("vor 15 Tagen") — expressed via
 *   `generation.instantUnitWords`; the remaining plurals already end in `-n`.
 */
export declare const DE_DE_GRAMMAR: LocaleGrammar;
