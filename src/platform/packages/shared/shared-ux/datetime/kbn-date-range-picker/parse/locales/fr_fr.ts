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
export const FR_FR_GRAMMAR: LocaleGrammar = {
  nowKeyword: 'maintenant',
  delimiters: [{ text: 'à' }, { text: 'a' }],
  namedRanges: {
    "aujourd'hui": { start: 'now/d', end: 'now/d' },
    hier: { start: 'now-1d/d', end: 'now-1d/d' },
    demain: { start: 'now+1d/d', end: 'now+1d/d' },
    'cette semaine': { start: 'now/w', end: 'now/w' },
    "cette semaine jusqu'à présent": { start: 'now/w', end: 'now' },
    'ce mois': { start: 'now/M', end: 'now/M' },
    "ce mois jusqu'à présent": { start: 'now/M', end: 'now' },
    'cette année': { start: 'now/y', end: 'now/y' },
    "cette année jusqu'à présent": { start: 'now/y', end: 'now' },
    'la semaine dernière': { start: 'now-1w/w', end: 'now-1w/w' },
    'le mois dernier': { start: 'now-1M/M', end: 'now-1M/M' },
    "l'année dernière": { start: 'now-1y/y', end: 'now-1y/y' },
    'la semaine prochaine': { start: 'now+1w/w', end: 'now+1w/w' },
    'le mois prochain': { start: 'now+1M/M', end: 'now+1M/M' },
    "l'année prochaine": { start: 'now+1y/y', end: 'now+1y/y' },
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
  // Every inflection parses; past/future lists stay index-aligned so
  // arrow-key direction flips preserve the typed inflection
  // ("dernières" ↔ "prochaines" — see modify_range_parts.ts).
  durationTemplates: {
    past: [
      'derniers {count} {unit}',
      'dernières {count} {unit}',
      'dernier {count} {unit}',
      'dernière {count} {unit}',
    ],
    future: [
      'prochains {count} {unit}',
      'prochaines {count} {unit}',
      'prochain {count} {unit}',
      'prochaine {count} {unit}',
    ],
  },
  instantTemplates: {
    // Aligned with moment/locale/fr.js's own `past: 'il y a %s'` / `future: 'dans %s'`.
    past: ['il y a {count} {unit}'],
    future: ['dans {count} {unit}'],
  },
  generation: {
    // The adjective agrees with the unit's gender and number: masculine
    // "jour"/"mois"/"an" vs feminine "milliseconde"/"seconde"/"minute"/
    // "heure"/"semaine".
    durationPast: {
      ms: { singular: 'dernière {count} {unit}', plural: 'dernières {count} {unit}' },
      s: { singular: 'dernière {count} {unit}', plural: 'dernières {count} {unit}' },
      m: { singular: 'dernière {count} {unit}', plural: 'dernières {count} {unit}' },
      h: { singular: 'dernière {count} {unit}', plural: 'dernières {count} {unit}' },
      w: { singular: 'dernière {count} {unit}', plural: 'dernières {count} {unit}' },
      d: { singular: 'dernier {count} {unit}' },
      M: { singular: 'dernier {count} {unit}' },
      y: { singular: 'dernier {count} {unit}' },
    },
    durationFuture: {
      ms: { singular: 'prochaine {count} {unit}', plural: 'prochaines {count} {unit}' },
      s: { singular: 'prochaine {count} {unit}', plural: 'prochaines {count} {unit}' },
      m: { singular: 'prochaine {count} {unit}', plural: 'prochaines {count} {unit}' },
      h: { singular: 'prochaine {count} {unit}', plural: 'prochaines {count} {unit}' },
      w: { singular: 'prochaine {count} {unit}', plural: 'prochaines {count} {unit}' },
      d: { singular: 'prochain {count} {unit}' },
      M: { singular: 'prochain {count} {unit}' },
      y: { singular: 'prochain {count} {unit}' },
    },
  },
};
