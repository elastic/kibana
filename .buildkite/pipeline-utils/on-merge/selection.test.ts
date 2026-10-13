/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fullSelection, parseOnMergeSelection, parseOnMergeSelectiveMode } from './selection.ts';

const COMMIT = 'c'.repeat(40);
const BASE = 'b'.repeat(40);

describe('parseOnMergeSelectiveMode', () => {
  it.each([
    [undefined, 'off'],
    ['', 'off'],
    ['off', 'off'],
    [' Shadow ', 'shadow'],
  ])('parses %p as %p', (raw, expected) => {
    expect(parseOnMergeSelectiveMode(raw)).toBe(expected);
  });

  it('rejects unknown modes', () => {
    expect(() => parseOnMergeSelectiveMode('enabled')).toThrow(
      'invalid ON_MERGE_SELECTIVE_MODE: enabled'
    );
  });
});

describe('parseOnMergeSelection', () => {
  const selection = {
    ...fullSelection(COMMIT, 'unused'),
    base: BASE,
    baseSource: 'github-activity',
    commitCount: 2,
    suites: {
      scout: { mode: 'selective' },
      jestUnit: { mode: 'selective' },
      jestIntegration: { mode: 'full', reason: 'ES snapshot changed' },
      ftr: { mode: 'selective' },
    },
  };

  it('round-trips a serialized selection', () => {
    expect(parseOnMergeSelection(JSON.stringify(selection))).toEqual(selection);
  });

  it.each([
    ['missing', null],
    ['empty', ''],
    ['invalid JSON', '{'],
    ['missing suites', JSON.stringify({ commit: COMMIT, base: BASE })],
    [
      'invalid suite decision',
      JSON.stringify({ ...selection, suites: { ...selection.suites, ftr: { mode: 'full' } } }),
    ],
  ])('returns null for %s input', (_, raw) => {
    expect(parseOnMergeSelection(raw)).toBeNull();
  });
});
