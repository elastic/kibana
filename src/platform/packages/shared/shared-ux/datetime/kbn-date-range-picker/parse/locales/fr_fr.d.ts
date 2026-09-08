import type { LocaleGrammar } from '../locale_grammar';
/**
 * French (`fr-FR`) grammar.
 *
 * Vocabulary drafted by AI assistance, seeded from `moment/locale/fr.js`'s
 * `relativeTime` dictionary (e.g. "jour"/"jours", "il y a %s", "dans %s"),
 * then refined with native-speaker review feedback:
 *
 * - Duration templates accept every gender/number inflection of
 *   "dernier"/"prochain"; `generation` picks the agreeing form for each unit
 *   ("Dernières 15 minutes" for the feminine "minute", "Derniers 15 jours"
 *   for the masculine "jour").
 * - The delimiter is accepted both accented ("à") and bare ("a", as commonly
 *   typed). The bare form is also a substring of the instant phrase
 *   "il y a …", which is why delimiter splitting is candidate-based — see
 *   `findDelimiterSplits` in `locale_grammar.ts`.
 */
export declare const FR_FR_GRAMMAR: LocaleGrammar;
