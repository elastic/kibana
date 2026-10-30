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
    ['shadow', 'shadow'],
  ])('parses %p as %p', (raw, expected) => {
    expect(parseOnMergeSelectiveMode(raw)).toBe(expected);
  });

  it('falls back to off for unknown modes instead of throwing', () => {
    // `loadRunOrderConfig()` reads this in a step that exits non-zero on any error,
    // so a typo has to disable the shadow run rather than fail the build.
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(parseOnMergeSelectiveMode('enabled')).toBe('off');
      expect(parseOnMergeSelectiveMode('Shadow')).toBe('off');
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Ignoring invalid ON_MERGE_SELECTIVE_MODE: enabled')
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe('parseOnMergeSelection', () => {
  const selection = {
    ...fullSelection(COMMIT, 'unused'),
    base: BASE,
    baseSource: 'github-activity',
    commitCount: 2,
    testTypes: {
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
  ])('returns null for %s input', (_, raw) => {
    expect(parseOnMergeSelection(raw)).toBeNull();
  });
});
