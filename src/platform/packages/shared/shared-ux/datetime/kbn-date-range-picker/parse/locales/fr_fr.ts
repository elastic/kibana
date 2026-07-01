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
 * French (`fr-FR`) grammar.
 *
 * Vocabulary drafted by AI assistance, seeded from `moment/locale/fr.js`'s
 * `relativeTime` dictionary (e.g. "jour"/"jours", "il y a %s", "dans %s").
 * **Needs native-speaker / localization-team review before this is
 * considered linguistically correct** — known simplification:
 *
 * - `durationTemplates` use a single fixed (masculine) adjective agreement
 *   ("derniers"/"prochains") rather than agreeing with each unit's
 *   grammatical gender — French wants "dernières semaines" for the feminine
 *   "semaine", not "derniers semaines". Same category of simplification as
 *   the German case-marking note in `de_de.ts` — flagged for review, not
 *   solved here.
 * - Delimiter ("à") and named-range phrasing are reasonable but not
 *   verified-idiomatic.
 */
export const FR_FR_GRAMMAR: LocaleGrammar = {
  nowKeyword: 'maintenant',
  delimiters: ['à'],
  namedRanges: {
    "aujourd'hui": { start: 'now/d', end: 'now/d' },
    hier: { start: 'now-1d/d', end: 'now-1d/d' },
    demain: { start: 'now+1d/d', end: 'now+1d/d' },
    'cette semaine': { start: 'now/w', end: 'now/w' },
    'ce mois': { start: 'now/M', end: 'now/M' },
    'cette année': { start: 'now/y', end: 'now/y' },
    'la semaine dernière': { start: 'now-1w/w', end: 'now-1w/w' },
    'le mois dernier': { start: 'now-1M/M', end: 'now-1M/M' },
    "l'année dernière": { start: 'now-1y/y', end: 'now-1y/y' },
  },
  // No localized aliases — `td`/`yd`/`tmr` are English mnemonics; we don't
  // invent equivalents unless a locale clearly wants them.
  namedRangeAliases: {},
  unitAliases: {
    milliseconde: 'ms',
    millisecondes: 'ms',
    seconde: 's',
    secondes: 's',
    minute: 'm',
    minutes: 'm',
    heure: 'h',
    heures: 'h',
    jour: 'd',
    jours: 'd',
    semaine: 'w',
    semaines: 'w',
    mois: 'M',
    an: 'y',
    ans: 'y',
    année: 'y',
    années: 'y',
  },
  unitWords: {
    ms: { singular: 'milliseconde', plural: 'millisecondes' },
    s: { singular: 'seconde', plural: 'secondes' },
    m: { singular: 'minute', plural: 'minutes' },
    h: { singular: 'heure', plural: 'heures' },
    d: { singular: 'jour', plural: 'jours' },
    w: { singular: 'semaine', plural: 'semaines' },
    M: { singular: 'mois', plural: 'mois' },
    y: { singular: 'an', plural: 'ans' },
  },
  durationTemplates: {
    past: ['derniers {count} {unit}'],
    future: ['prochains {count} {unit}'],
  },
  instantTemplates: {
    // Aligned with moment/locale/fr.js's own `past: 'il y a %s'` / `future: 'dans %s'`.
    past: ['il y a {count} {unit}'],
    future: ['dans {count} {unit}'],
  },
};
