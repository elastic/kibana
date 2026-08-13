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
export const DE_DE_GRAMMAR: LocaleGrammar = {
  nowKeyword: 'jetzt',
  delimiters: [{ text: 'bis' }],
  namedRanges: {
    heute: { start: 'now/d', end: 'now/d' },
    gestern: { start: 'now-1d/d', end: 'now-1d/d' },
    morgen: { start: 'now+1d/d', end: 'now+1d/d' },
    'diese woche': { start: 'now/w', end: 'now/w' },
    'diese woche bis jetzt': { start: 'now/w', end: 'now' },
    'diesen monat': { start: 'now/M', end: 'now/M' },
    'dieser monat': { start: 'now/M', end: 'now/M' },
    'diesen monat bis jetzt': { start: 'now/M', end: 'now' },
    'dieser monat bis jetzt': { start: 'now/M', end: 'now' },
    'dieses jahr': { start: 'now/y', end: 'now/y' },
    'dieses jahr bis jetzt': { start: 'now/y', end: 'now' },
    'letzte woche': { start: 'now-1w/w', end: 'now-1w/w' },
    'letzten monat': { start: 'now-1M/M', end: 'now-1M/M' },
    'letzter monat': { start: 'now-1M/M', end: 'now-1M/M' },
    'letztes jahr': { start: 'now-1y/y', end: 'now-1y/y' },
    'nächste woche': { start: 'now+1w/w', end: 'now+1w/w' },
    'nächsten monat': { start: 'now+1M/M', end: 'now+1M/M' },
    'nächster monat': { start: 'now+1M/M', end: 'now+1M/M' },
    'nächstes jahr': { start: 'now+1y/y', end: 'now+1y/y' },
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
  // Every adjective ending parses; past/future lists stay index-aligned so
  // arrow-key direction flips preserve the typed inflection
  // ("letzter" ↔ "nächster" — see modify_range_parts.ts).
  durationTemplates: {
    past: [
      'letzte {count} {unit}',
      'letzter {count} {unit}',
      'letztes {count} {unit}',
      'letzten {count} {unit}',
    ],
    future: [
      'nächste {count} {unit}',
      'nächster {count} {unit}',
      'nächstes {count} {unit}',
      'nächsten {count} {unit}',
    ],
  },
  instantTemplates: {
    // Aligned with moment/locale/de.js's own `past: 'vor %s'` / `future: 'in %s'`.
    past: ['vor {count} {unit}'],
    future: ['in {count} {unit}'],
  },
  generation: {
    // Singular adjective agrees with the unit's gender: der Tag / der Monat
    // (masculine → "letzter"), das Jahr (neuter → "letztes"); the feminine
    // units and all plurals keep the default "letzte"/"nächste".
    durationPast: {
      d: { singular: 'letzter {count} {unit}' },
      M: { singular: 'letzter {count} {unit}' },
      y: { singular: 'letztes {count} {unit}' },
    },
    durationFuture: {
      d: { singular: 'nächster {count} {unit}' },
      M: { singular: 'nächster {count} {unit}' },
      y: { singular: 'nächstes {count} {unit}' },
    },
    // "vor"/"in" take the dative, which adds `-n` to these plurals; the other
    // units' plurals (Minuten, Wochen, …) already end in `-n`.
    instantUnitWords: {
      d: { plural: 'Tagen' },
      M: { plural: 'Monaten' },
      y: { plural: 'Jahren' },
    },
  },
};
