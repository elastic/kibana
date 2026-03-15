/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { wrapLines } from './documentation';

describe('wrapLines', () => {
  it('returns short lines unchanged', () => {
    expect(wrapLines('FROM index')).toBe('FROM index');
  });

  it('preserves existing multi-line text that fits', () => {
    const input = 'ROW a=1\nROW a=1, b=2';
    expect(wrapLines(input)).toBe(input);
  });

  it('splits long tokens at delimiter characters', () => {
    const input = '[step=<duration>|buckets=<integer>] rest';
    const result = wrapLines(input);

    expect(result).toContain('[step=<duration>|');
    expect(result).toContain('buckets=<integer>]');
  });

  it('wraps long examples', () => {
    const input =
      'PROMQL index=metrics step=1m start=?_tstart end=?_tend (sum by (instance) (bytes))';
    const result = wrapLines(input);

    for (const line of result.split('\n')) {
      expect(line.length).toBeLessThanOrEqual(30);
    }
  });
});
