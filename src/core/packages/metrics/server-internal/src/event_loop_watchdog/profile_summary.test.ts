/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sanitizeLocation, summarizeProfile, type CpuProfile } from './profile_summary';

const ROOT = '/srv/kibana';

const node = (id: number, functionName: string, url = '', lineNumber = -1) => ({
  id,
  callFrame: { functionName, url, lineNumber },
});

/**
 * Builds a profile on a clock offset by `offset` µs from the worker clock, with one sample
 * per millisecond.
 */
const buildProfile = (startUs: number, sampleNodeIds: number[], offset = 42_000_000) => {
  const profile: CpuProfile = {
    nodes: [
      { ...node(1, '(root)'), children: [7] },
      { ...node(7, 'runTask', `file://${ROOT}/src/runner.ts`, 0), children: [3, 5] },
      node(2, '(idle)'),
      node(3, 'busyLoop', `file://${ROOT}/src/plugins/foo/server/task.ts`, 9),
      node(4, '(garbage collector)'),
      node(5, 'external', '/opt/elsewhere/lib/thing.js?x=1', 0),
      node(6, '(program)'),
    ],
    startTime: startUs + offset,
    endTime: startUs + offset + sampleNodeIds.length * 1000,
    samples: sampleNodeIds,
    timeDeltas: sampleNodeIds.map(() => 1000),
  };
  return profile;
};

describe('sanitizeLocation', () => {
  it('makes repo paths relative, keeps node specifiers and reduces others to basenames', () => {
    expect(sanitizeLocation(`file://${ROOT}/src/a.ts`, 4, ROOT)).toBe('src/a.ts:5');
    expect(sanitizeLocation('node:internal/timers', 10, ROOT)).toBe('node:internal/timers:11');
    expect(sanitizeLocation('/home/user/secret/path/x.js?token=abc', 0, ROOT)).toBe('x.js:1');
    expect(sanitizeLocation('', 0, ROOT)).toBe('');
  });
});

describe('summarizeProfile sanitisation', () => {
  it('replaces control characters and caps frame names', () => {
    const profile: CpuProfile = {
      nodes: [
        { ...node(1, '(root)'), children: [2] },
        { ...node(2, 'caller\nFAKE LOG LINE', '', -1), children: [3] },
        node(3, `evil\r\n${'x'.repeat(1000)}`, `file://${ROOT}/src/a\n.js`, 0),
      ],
      startTime: 1_000_000,
      endTime: 1_100_000,
      samples: Array(100).fill(3),
      timeDeltas: Array(100).fill(1000),
    };
    const [frame] = summarizeProfile(profile, {
      sanitizeRoot: ROOT,
      maxFrames: 1,
      windowStartUs: 900_000,
      windowEndUs: 1_200_000,
      startAckUs: 1_000_000,
    }).frames;
    expect(frame.functionName.startsWith('evil??x')).toBe(true);
    expect(frame.functionName).toHaveLength(256);
    expect(frame.location).toBe('src/a?.js:1');
    expect(frame.callers).toEqual(['caller?FAKE LOG LINE']);
  });
});

describe('summarizeProfile', () => {
  const options = { sanitizeRoot: ROOT, maxFrames: 2 };

  it('attributes in-window JS samples to sanitised frames despite clock offsets', () => {
    // profile acknowledged at t=1_000_000µs; block spans [900_000, 1_500_000]
    const samples = [...Array(400).fill(3), ...Array(50).fill(4), ...Array(50).fill(5)];
    const summary = summarizeProfile(buildProfile(1_000_000, samples), {
      ...options,
      windowStartUs: 900_000,
      windowEndUs: 1_500_000,
      startAckUs: 1_000_000,
    });

    expect(summary.verdict).toBe('profiled');
    expect(summary.frames).toEqual([
      {
        functionName: 'busyLoop',
        location: 'src/plugins/foo/server/task.ts:10',
        selfTimeMs: 400,
        selfPercent: 80,
        callers: ['runTask (src/runner.ts:1)'],
      },
      expect.objectContaining({ functionName: expect.stringMatching(/garbage|external/) }),
    ]);
    expect(summary.gcPercent).toBe(10);
  });

  it('is inconclusive when the profiler started after the block ended', () => {
    const summary = summarizeProfile(buildProfile(2_000_000, Array(100).fill(3)), {
      ...options,
      windowStartUs: 900_000,
      windowEndUs: 1_900_000,
      startAckUs: 2_000_000,
    });
    expect(summary).toEqual(expect.objectContaining({ verdict: 'inconclusive', frames: [] }));
    expect(summary.reason).toMatch(/after the block ended/);
  });

  it('is inconclusive when the profiled window is mostly idle or program samples', () => {
    const samples = [...Array(80).fill(2), ...Array(10).fill(6), ...Array(10).fill(3)];
    const summary = summarizeProfile(buildProfile(1_000_000, samples), {
      ...options,
      windowStartUs: 900_000,
      windowEndUs: 1_100_000,
      startAckUs: 1_000_000,
    });
    expect(summary.verdict).toBe('inconclusive');
    expect(summary.reason).toMatch(/10% of the profiled 100ms/);
  });

  it('ignores samples outside the block window', () => {
    // block ends 50ms into the profile; the remaining samples belong to post-block work
    const samples = [...Array(50).fill(3), ...Array(200).fill(5)];
    const summary = summarizeProfile(buildProfile(1_000_000, samples), {
      ...options,
      windowStartUs: 900_000,
      windowEndUs: 1_050_000,
      startAckUs: 1_000_000,
    });
    expect(summary.verdict).toBe('profiled');
    expect(summary.frames.map(({ functionName }) => functionName)).toEqual(['busyLoop']);
  });
});
