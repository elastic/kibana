/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPresetLabel } from './preset_label';

describe('getPresetLabel', () => {
  it('returns null without a label', () => {
    expect(getPresetLabel({ start: 'now-15m', end: 'now' })).toBeNull();
  });

  it.each([
    ['Last 15 minutes', 'now-15m', 'now'],
    ['Today', 'now/d', 'now/d'],
    ['This week until now', 'now/w', 'now'],
  ])('keeps the natural-language label "%s"', (label, start, end) => {
    expect(getPresetLabel({ start, end, label })).toBe(label);
  });

  it.each([
    ['Financial Year to Date', 'now-3M/y+3M', 'now'],
    ['My custom preset', 'now-15m', 'now'],
    ['Q1', 'now/y', 'now/y+3M'],
  ])('keeps the custom label "%s"', (label, start, end) => {
    expect(getPresetLabel({ start, end, label })).toBe(label);
  });

  it.each([
    ['May 1, 00:00 → May 2, 23:59', '2026-05-01T00:00:00.000Z', '2026-05-02T23:59:00.000Z'],
    ['15 minutes ago → 15:55:55', 'now-15m/m', '2026-06-29T13:55:55.000Z'],
    ['now-3M/y+3M → now', 'now-3M/y+3M', 'now'],
  ])('drops the frozen display text "%s"', (label, start, end) => {
    expect(getPresetLabel({ start, end, label })).toBeNull();
  });

  it('drops a label that is the raw input form of the option bounds', () => {
    expect(getPresetLabel({ start: 'now-15m', end: 'now', label: '-15m to now' })).toBeNull();
    expect(getPresetLabel({ start: 'now-7d', end: 'now-1d', label: '-7d to -1d' })).toBeNull();
  });

  it('keeps a label that parses to bounds other than the option bounds', () => {
    // A name that happens to be parseable still names a different range, so it stays
    expect(getPresetLabel({ start: 'now-1y/y', end: 'now', label: '-1y' })).toBe('-1y');
  });
});
