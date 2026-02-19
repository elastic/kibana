/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { durationToDisplayShortText, MS_PER } from './format_duration';

const seconds = (num: number) => new Date(num * MS_PER.second);
const minutes = (num: number) => new Date(num * MS_PER.minute);
const hours = (num: number) => new Date(num * MS_PER.hour);
const days = (num: number) => new Date(num * MS_PER.day);
const weeks = (num: number) => new Date(num * MS_PER.week);
const months = (num: number) => new Date(num * MS_PER.month);
const years = (num: number) => new Date(num * MS_PER.year);

describe('durationToDisplayShortText', () => {
  it('formats basic durations', () => {
    const start = new Date(0);

    expect(durationToDisplayShortText(start, new Date(500))).toBe('500ms');
    expect(durationToDisplayShortText(start, seconds(5))).toBe('5s');
    expect(durationToDisplayShortText(start, minutes(15))).toBe('15min');
    expect(durationToDisplayShortText(start, hours(12))).toBe('12h');
    expect(durationToDisplayShortText(start, hours(48))).toBe('2d');
    expect(durationToDisplayShortText(start, days(3))).toBe('3d');
    expect(durationToDisplayShortText(start, weeks(2))).toBe('2w');
    expect(durationToDisplayShortText(start, months(4))).toBe('4mos');
    expect(durationToDisplayShortText(start, years(1))).toBe('1y');
    expect(durationToDisplayShortText(start, years(1.5))).toBe('1.5y');
  });

  it('adds approximation tilde according to deviation thresholds', () => {
    const start = new Date(0);

    expect(durationToDisplayShortText(start, seconds(59))).toBe('59s');
    expect(durationToDisplayShortText(start, new Date(59900))).toBe('59s');
    expect(durationToDisplayShortText(start, minutes(1))).toBe('1min');
    expect(durationToDisplayShortText(start, minutes(59))).toBe('59min');
    expect(durationToDisplayShortText(start, minutes(61))).toBe('~1h');
    expect(durationToDisplayShortText(start, minutes(119))).toBe('~2h');
    expect(durationToDisplayShortText(start, minutes(150))).toBe('~3h');
    expect(durationToDisplayShortText(start, hours(23))).toBe('23h');
    expect(durationToDisplayShortText(start, hours(25))).toBe('~1d');
    expect(durationToDisplayShortText(start, days(6))).toBe('6d');
    expect(durationToDisplayShortText(start, days(7))).toBe('1w');
    expect(durationToDisplayShortText(start, days(25))).toBe('~4w');
    expect(durationToDisplayShortText(start, days(105))).toBe('~3mos');
    expect(durationToDisplayShortText(start, days(360))).toBe('~1y');
  });
});
