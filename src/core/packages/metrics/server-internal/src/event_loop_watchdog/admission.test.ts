/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_ADMISSION_LIMITS, WriteAdmission } from './admission';

const written = (admission: WriteAdmission, blocks: number[]) =>
  blocks.filter((ms) => admission.admit(ms).write);

describe('WriteAdmission', () => {
  const limits = { maxLargest: 3, minGrowth: 1.25, maxRanked: 70, maxFiles: 100 };

  it('writes every window until the ranking is full', () => {
    const admission = new WriteAdmission(limits);
    expect(written(admission, [300, 200, 250])).toEqual([300, 200, 250]);
  });

  it('then writes only windows exceeding the smallest ranked block by the growth factor', () => {
    const admission = new WriteAdmission(limits);
    written(admission, [300, 200, 250]);
    // 250 (=200x1.25) does not exceed the bar; 251 does and pushes 200 out of the ranking
    expect(admission.admit(250)).toEqual({
      write: false,
      reason: 'not above ~250ms (1.25x the smallest of the 3 largest blocks written)',
    });
    expect(admission.admit(251).write).toBe(true);
    // the ranking is now [300, 251, 250]: the bar is 250x1.25
    expect(written(admission, [300, 312, 313])).toEqual([313]);
  });

  it('writes a block within the growth factor of the largest of a shuffled session', () => {
    const blocks = Array.from({ length: 1_000 }, (_, i) => 200 + ((i * 7919) % 997));
    const files = written(new WriteAdmission(), blocks);
    expect(Math.max(...files) * 1.25).toBeGreaterThanOrEqual(Math.max(...blocks));
    expect(files.length).toBeLessThan(DEFAULT_ADMISSION_LIMITS.maxFiles);
  });

  it('keeps writing records once the ranked budget is used up', () => {
    const admission = new WriteAdmission({
      maxLargest: 2,
      minGrowth: 1.25,
      maxRanked: 2,
      maxFiles: 10,
    });
    // 100 is a record; 90 and 120 rank (95 does not exceed 90x1.25); the ranked budget is used
    expect(written(admission, [100, 90, 95, 120])).toEqual([100, 90, 120]);
    expect(admission.admit(130)).toEqual({
      write: false,
      reason: 'ranked file budget (2) used and not above ~150ms (1.25x the largest block written)',
    });
    expect(admission.admit(151).write).toBe(true);
  });

  it('writes a block within the growth factor of the largest while blocks keep growing', () => {
    // a leak: every window's block is larger than the previous one, 200ms to 20s
    const blocks = Array.from({ length: 10_000 }, (_, i) => 200 + i * 2);
    const files = written(new WriteAdmission(), blocks);
    expect(Math.max(...files) * 1.25).toBeGreaterThanOrEqual(blocks[blocks.length - 1]);
    expect(files.length).toBeLessThanOrEqual(DEFAULT_ADMISSION_LIMITS.maxFiles);
  });

  it('stops writing at the file limit', () => {
    const admission = new WriteAdmission({
      maxLargest: 10,
      minGrowth: 1,
      maxRanked: 10,
      maxFiles: 2,
    });
    expect(written(admission, [200, 300, 400])).toEqual([200, 300]);
    expect(admission.admit(500)).toEqual({ write: false, reason: 'file limit (2) reached' });
  });
});
