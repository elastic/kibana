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
 * Brazilian Portuguese (`pt-BR`) grammar.
 *
 * Vocabulary drafted by AI assistance, seeded from `moment/locale/pt-br.js`'s
 * `relativeTime` dictionary (e.g. "dia"/"dias", "há %s", "em %s") and from the
 * `pt-BR.json` bundle's existing date-picker wording ("Últimos 15 minutos",
 * "Últimas 24 horas", "Este mês até agora"). Unlike the other locale grammars
 * here, it has NOT yet had native-speaker review.
 *
 * - Duration templates accept every gender/number inflection of
 *   "último"/"próximo"; `generation` picks the agreeing form for each unit
 *   ("Últimas 24 horas" for the feminine "hora", "Últimos 7 dias" for the
 *   masculine "dia").
 * - The delimiter is accepted both as "até" and as the bare preposition "a",
 *   which is also a substring of many words — delimiter splitting is
 *   candidate-based, see `findDelimiterSplits` in `locale_grammar.ts`.
 * - Accents are required on input, matching the `de-DE`/`fr-FR` grammars:
 *   every accepted surface form is one the generator can also produce.
 */
export const PT_BR_GRAMMAR: LocaleGrammar = {
  nowKeyword: 'agora',
  delimiters: [{ text: 'até' }, { text: 'a' }],
  namedRanges: {
    hoje: { start: 'now/d', end: 'now/d' },
    ontem: { start: 'now-1d/d', end: 'now-1d/d' },
    amanhã: { start: 'now+1d/d', end: 'now+1d/d' },
    'esta semana': { start: 'now/w', end: 'now/w' },
    'esta semana até agora': { start: 'now/w', end: 'now' },
    'este mês': { start: 'now/M', end: 'now/M' },
    'este mês até agora': { start: 'now/M', end: 'now' },
    'este ano': { start: 'now/y', end: 'now/y' },
    'este ano até agora': { start: 'now/y', end: 'now' },
    'semana passada': { start: 'now-1w/w', end: 'now-1w/w' },
    'última semana': { start: 'now-1w/w', end: 'now-1w/w' },
    'mês passado': { start: 'now-1M/M', end: 'now-1M/M' },
    'último mês': { start: 'now-1M/M', end: 'now-1M/M' },
    'ano passado': { start: 'now-1y/y', end: 'now-1y/y' },
    'último ano': { start: 'now-1y/y', end: 'now-1y/y' },
    'próxima semana': { start: 'now+1w/w', end: 'now+1w/w' },
    'próximo mês': { start: 'now+1M/M', end: 'now+1M/M' },
    'próximo ano': { start: 'now+1y/y', end: 'now+1y/y' },
  },
  // No localized aliases — `td`/`yd`/`tmr` are English mnemonics; we don't
  // invent equivalents unless a locale clearly wants them.
  namedRangeAliases: {},
  unitAliases: {
    milissegundo: 'ms',
    milissegundos: 'ms',
    segundo: 's',
    segundos: 's',
    minuto: 'm',
    minutos: 'm',
    hora: 'h',
    horas: 'h',
    dia: 'd',
    dias: 'd',
    semana: 'w',
    semanas: 'w',
    mês: 'M',
    meses: 'M',
    ano: 'y',
    anos: 'y',
  },
  unitWords: {
    ms: { singular: 'milissegundo', plural: 'milissegundos' },
    s: { singular: 'segundo', plural: 'segundos' },
    m: { singular: 'minuto', plural: 'minutos' },
    h: { singular: 'hora', plural: 'horas' },
    d: { singular: 'dia', plural: 'dias' },
    w: { singular: 'semana', plural: 'semanas' },
    M: { singular: 'mês', plural: 'meses' },
    y: { singular: 'ano', plural: 'anos' },
  },
  // Every inflection parses; past/future lists stay index-aligned so
  // arrow-key direction flips preserve the typed inflection
  // ("últimas" ↔ "próximas" — see modify_range_parts.ts).
  durationTemplates: {
    past: [
      'últimos {count} {unit}',
      'últimas {count} {unit}',
      'último {count} {unit}',
      'última {count} {unit}',
    ],
    future: [
      'próximos {count} {unit}',
      'próximas {count} {unit}',
      'próximo {count} {unit}',
      'próxima {count} {unit}',
    ],
  },
  instantTemplates: {
    // First entries aligned with moment/locale/pt-br.js's own `past: 'há %s'` /
    // `future: 'em %s'`; "{count} {unit} atrás" is the common spoken variant.
    past: ['há {count} {unit}', '{count} {unit} atrás'],
    future: ['em {count} {unit}'],
  },
  generation: {
    // The adjective agrees with the unit's gender: feminine "hora"/"semana"
    // take "última"/"últimas"; the masculine units keep the default
    // "últimos" in the plural and switch to "último" in the singular.
    durationPast: {
      h: { singular: 'última {count} {unit}', plural: 'últimas {count} {unit}' },
      w: { singular: 'última {count} {unit}', plural: 'últimas {count} {unit}' },
      ms: { singular: 'último {count} {unit}' },
      s: { singular: 'último {count} {unit}' },
      m: { singular: 'último {count} {unit}' },
      d: { singular: 'último {count} {unit}' },
      M: { singular: 'último {count} {unit}' },
      y: { singular: 'último {count} {unit}' },
    },
    durationFuture: {
      h: { singular: 'próxima {count} {unit}', plural: 'próximas {count} {unit}' },
      w: { singular: 'próxima {count} {unit}', plural: 'próximas {count} {unit}' },
      ms: { singular: 'próximo {count} {unit}' },
      s: { singular: 'próximo {count} {unit}' },
      m: { singular: 'próximo {count} {unit}' },
      d: { singular: 'próximo {count} {unit}' },
      M: { singular: 'próximo {count} {unit}' },
      y: { singular: 'próximo {count} {unit}' },
    },
  },
};
