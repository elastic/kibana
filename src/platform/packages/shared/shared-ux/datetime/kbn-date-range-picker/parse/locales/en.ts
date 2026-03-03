/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ParserLocale } from '../../types';

/** English locale definition for the date range text parser */
export const en: ParserLocale = {
  now: 'now',
  delimiters: ['to', 'until'],
  namedRanges: {
    today: { start: 'now/d', end: 'now/d' },
    yesterday: { start: 'now-1d/d', end: 'now-1d/d' },
    tomorrow: { start: 'now+1d/d', end: 'now+1d/d' },
    'this week': { start: 'now/w', end: 'now/w' },
    'this month': { start: 'now/M', end: 'now/M' },
    'this year': { start: 'now/y', end: 'now/y' },
    'last week': { start: 'now-1w/w', end: 'now-1w/w' },
    'last month': { start: 'now-1M/M', end: 'now-1M/M' },
    'last year': { start: 'now-1y/y', end: 'now-1y/y' },
  },
  unitAliases: {
    ms: 'ms',
    s: 's',
    m: 'm',
    h: 'h',
    d: 'd',
    w: 'w',
    M: 'M',
    y: 'y',
    millisecond: 'ms',
    milliseconds: 'ms',
    second: 's',
    seconds: 's',
    sec: 's',
    secs: 's',
    minute: 'm',
    minutes: 'm',
    min: 'm',
    mins: 'm',
    hour: 'h',
    hours: 'h',
    hr: 'h',
    hrs: 'h',
    day: 'd',
    days: 'd',
    week: 'w',
    weeks: 'w',
    wk: 'w',
    wks: 'w',
    month: 'M',
    months: 'M',
    mo: 'M',
    mos: 'M',
    year: 'y',
    years: 'y',
    yr: 'y',
    yrs: 'y',
  },
  naturalDuration: {
    past: ['last {count} {unit}'],
    future: ['next {count} {unit}'],
  },
  naturalInstant: {
    past: ['{count} {unit} ago'],
    future: ['{count} {unit} from now', 'in {count} {unit}'],
  },
  // RFC 2822 (order matters)
  absoluteFormats: [
    'MMM D YYYY, HH:mm',
    'MMM D, HH:mm',
    'MMM D YYYY',
    'MMM D, YYYY',
    'MMM D',
    'ddd, DD MMM YYYY HH:mm:ss ZZ',
  ],
};
