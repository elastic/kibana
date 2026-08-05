/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { chunkIndicesForFieldCaps } from './chunk_indices_for_field_caps';

describe('chunkIndicesForFieldCaps()', () => {
  it('returns [] for undefined', () => {
    expect(chunkIndicesForFieldCaps(undefined)).toEqual([]);
  });

  it('returns [] for an empty array', () => {
    expect(chunkIndicesForFieldCaps([])).toEqual([]);
  });

  it('returns [] for an empty string', () => {
    expect(chunkIndicesForFieldCaps('')).toEqual([]);
  });

  it('returns a single chunk for a short comma-separated string', () => {
    expect(chunkIndicesForFieldCaps('logs-*,metrics-*')).toEqual([['logs-*', 'metrics-*']]);
  });

  it('returns a single chunk for a short array', () => {
    expect(chunkIndicesForFieldCaps(['logs-*', 'metrics-*'])).toEqual([['logs-*', 'metrics-*']]);
  });

  it('splits comma-separated entries inside an array', () => {
    expect(chunkIndicesForFieldCaps(['logs-*,metrics-*', 'traces-*'])).toEqual([
      ['logs-*', 'metrics-*', 'traces-*'],
    ]);
  });

  it('trims whitespace around patterns', () => {
    expect(chunkIndicesForFieldCaps('logs-* , metrics-*')).toEqual([['logs-*', 'metrics-*']]);
  });

  it('splits a long pattern list into multiple chunks under the length budget', () => {
    const patterns = Array.from({ length: 50 }, (_, i) => `index-${i}`);
    const chunks = chunkIndicesForFieldCaps(patterns.join(','), 100);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.flat().sort()).toEqual([...patterns].sort());

    for (const chunk of chunks) {
      const encodedLength = encodeURIComponent(chunk.join(',')).length;
      expect(encodedLength).toBeLessThanOrEqual(100);
    }
  });

  it('never splits a single pattern that alone exceeds the budget', () => {
    const hugePattern = 'index-' + 'a'.repeat(200);
    const chunks = chunkIndicesForFieldCaps([hugePattern, 'small-index'], 50);

    expect(chunks.flat()).toEqual(expect.arrayContaining([hugePattern, 'small-index']));
    expect(chunks.some((chunk) => chunk.includes(hugePattern))).toBe(true);
  });

  it('repeats negation patterns in every chunk', () => {
    const patterns = ['a-*', 'b-*', 'c-*', '-excluded-a-*', '-excluded-b-*'];
    // small budget forces at least 2 chunks for the 3 positive patterns
    const chunks = chunkIndicesForFieldCaps(patterns.join(','), 12);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk).toEqual(expect.arrayContaining(['-excluded-a-*', '-excluded-b-*']));
    }
    // every positive pattern still shows up somewhere
    expect(chunks.flat()).toEqual(expect.arrayContaining(['a-*', 'b-*', 'c-*']));
  });

  it('returns a single chunk of just the negations when there are no positive patterns', () => {
    expect(chunkIndicesForFieldCaps(['-excluded-a-*', '-excluded-b-*'])).toEqual([
      ['-excluded-a-*', '-excluded-b-*'],
    ]);
  });

  it('does not split commas inside a date-math expression', () => {
    expect(chunkIndicesForFieldCaps('<logstash-{now/d}>,other-*')).toEqual([
      ['<logstash-{now/d}>', 'other-*'],
    ]);
  });
});
