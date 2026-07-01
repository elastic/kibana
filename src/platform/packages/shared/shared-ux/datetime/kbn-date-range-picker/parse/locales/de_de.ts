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
 * German (`de-DE`) grammar.
 *
 * Vocabulary drafted by AI assistance, seeded from `moment/locale/de.js`'s
 * `relativeTime` dictionary where it covers a unit (e.g. "Tag"/"Tage",
 * "Minute"/"Minuten"). Gaps (named ranges, delimiter, templates) filled by
 * hand. **Needs native-speaker / localization-team review before this is
 * considered linguistically correct** — known simplifications:
 *
 * - `unitWords` use the nominative case for both singular and plural
 *   (e.g. `Tag`/`Tage`). German grammar technically wants the dative case
 *   after a preposition (`einem Tag`/`Tagen`, confirmed in
 *   `moment/locale/de.js`'s `processRelativeTime`). Generated text will be
 *   slightly non-idiomatic in some phrases (understandable, not wrong-meaning).
 * - Delimiter ("bis") and named-range phrasing are reasonable but not
 *   verified-idiomatic.
 */
export const DE_DE_GRAMMAR: LocaleGrammar = {
  nowKeyword: 'jetzt',
  delimiters: ['bis'],
  namedRanges: {
    heute: { start: 'now/d', end: 'now/d' },
    gestern: { start: 'now-1d/d', end: 'now-1d/d' },
    morgen: { start: 'now+1d/d', end: 'now+1d/d' },
    'diese woche': { start: 'now/w', end: 'now/w' },
    'diesen monat': { start: 'now/M', end: 'now/M' },
    'dieses jahr': { start: 'now/y', end: 'now/y' },
    'letzte woche': { start: 'now-1w/w', end: 'now-1w/w' },
    'letzten monat': { start: 'now-1M/M', end: 'now-1M/M' },
    'letztes jahr': { start: 'now-1y/y', end: 'now-1y/y' },
  },
  // No localized aliases — `td`/`yd`/`tmr` are English mnemonics; we don't
  // invent equivalents unless a locale clearly wants them.
  namedRangeAliases: {},
  unitAliases: {
    millisekunde: 'ms',
    millisekunden: 'ms',
    sekunde: 's',
    sekunden: 's',
    minute: 'm',
    minuten: 'm',
    stunde: 'h',
    stunden: 'h',
    tag: 'd',
    tage: 'd',
    tagen: 'd',
    woche: 'w',
    wochen: 'w',
    monat: 'M',
    monate: 'M',
    monaten: 'M',
    jahr: 'y',
    jahre: 'y',
    jahren: 'y',
  },
  unitWords: {
    ms: { singular: 'Millisekunde', plural: 'Millisekunden' },
    s: { singular: 'Sekunde', plural: 'Sekunden' },
    m: { singular: 'Minute', plural: 'Minuten' },
    h: { singular: 'Stunde', plural: 'Stunden' },
    d: { singular: 'Tag', plural: 'Tage' },
    w: { singular: 'Woche', plural: 'Wochen' },
    M: { singular: 'Monat', plural: 'Monate' },
    y: { singular: 'Jahr', plural: 'Jahre' },
  },
  durationTemplates: {
    past: ['letzte {count} {unit}'],
    future: ['nächste {count} {unit}'],
  },
  instantTemplates: {
    // Aligned with moment/locale/de.js's own `past: 'vor %s'` / `future: 'in %s'`.
    past: ['vor {count} {unit}'],
    future: ['in {count} {unit}'],
  },
};
