/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  TRIMMED_FRAME,
  formatSummary,
  sampleTimestamps,
  sanitizeLocation,
  summarizeProfile,
  trimToBlocks,
  type CpuProfile,
} from './profile_summary';

const ROOT = '/kibana';

/** Builds a `.cpuprofile`; stacks are listed leaf first. */
const buildProfile = (
  samples: Array<{ stack: string[]; at: number }>,
  { startTime = 0, endTime = 10_000 } = {}
): CpuProfile => {
  const nodes: CpuProfile['nodes'] = [
    { id: 1, callFrame: { functionName: '(root)', url: '', lineNumber: -1, columnNumber: -1 } },
  ];
  const leafOf = (stack: string[]) => {
    let parent = nodes[0];
    for (const name of [...stack].reverse()) {
      let node = nodes.find(
        ({ id, callFrame }) => callFrame.functionName === name && parent.children?.includes(id)
      );
      if (!node) {
        node = {
          id: nodes.length + 1,
          callFrame: {
            functionName: name,
            url: name.startsWith('(') ? '' : `file://${ROOT}/src/${name}.ts`,
            lineNumber: 9,
            columnNumber: 0,
          },
        };
        nodes.push(node);
        parent.children = [...(parent.children ?? []), node.id];
      }
      parent = node;
    }
    return parent.id;
  };
  const leaves = samples.map(({ stack }) => leafOf(stack));
  return {
    nodes,
    startTime,
    endTime,
    samples: leaves,
    timeDeltas: samples.map(({ at }, i) => at - (i === 0 ? startTime : samples[i - 1].at)),
  };
};

const names = (profile: CpuProfile) =>
  profile.nodes.map(({ callFrame }) => callFrame.functionName).sort();

describe('summarizeProfile', () => {
  const profile = buildProfile([
    { stack: ['now', 'handler', 'run'], at: 1_100 },
    { stack: ['now', 'handler', 'run'], at: 1_200 },
    { stack: ['now', 'handler', 'run'], at: 1_300 },
    { stack: ['now', 'handler', 'run'], at: 1_400 },
    { stack: ['handler', 'run'], at: 1_500 },
    { stack: ['(idle)'], at: 1_600 },
    ...Array.from({ length: 10 }, (_, i) => ({ stack: ['other', 'run'], at: 5_000 + i })),
    { stack: ['(idle)'], at: 6_000 },
  ]);

  it('summarises busy samples within the blocks: self frames and callers', () => {
    expect(summarizeProfile(profile, [[1_000, 2_000]], ROOT)).toEqual({
      scope: 'blocks',
      samples: 5,
      windowSamples: 15,
      frames: [
        {
          name: 'now',
          location: 'src/now.ts:10',
          samples: 4,
          percent: 80,
          callers: ['handler (src/handler.ts:10)', 'run (src/run.ts:10)'],
        },
        {
          name: 'handler',
          location: 'src/handler.ts:10',
          samples: 1,
          percent: 20,
          callers: ['run (src/run.ts:10)'],
        },
      ],
    });
  });

  it('falls back to the whole window when no sample is within a block', () => {
    const summary = summarizeProfile(profile, [[9_000, 9_500]], ROOT);
    expect(summary).toMatchObject({ scope: 'window', samples: 15, windowSamples: 15 });
    expect(summary.frames[0]).toMatchObject({ name: 'other', samples: 10 });
  });

  it('formats a single readable line', () => {
    const summary = summarizeProfile(profile, [[1_000, 2_000]], ROOT);
    expect(formatSummary(summary, [1203], 1, { file: '/diag/x.cpuprofile' })).toBe(
      'Event loop block profile #1: blocks [~1203ms], 5/15 samples in blocks. ' +
        'Top: 80% now (src/now.ts:10) <- handler (src/handler.ts:10) <- run (src/run.ts:10); ' +
        '20% handler (src/handler.ts:10) <- run (src/run.ts:10). File: /diag/x.cpuprofile'
    );
    expect(formatSummary(summary, [1203], 2, { notWritten: 'file limit (100) reached' })).toMatch(
      /^Event loop block profile #2: .* Not written: file limit \(100\) reached\.$/
    );
  });
});

describe('trimToBlocks', () => {
  const profile = buildProfile([
    { stack: ['early', 'run'], at: 100 },
    { stack: ['before', 'run'], at: 1_500 },
    { stack: ['now', 'handler', 'run'], at: 2_000 },
    { stack: ['now', 'handler', 'run'], at: 2_400 },
    { stack: ['between', 'run'], at: 5_000 },
    { stack: ['spin', 'run'], at: 8_000 },
    { stack: ['late', 'run'], at: 9_900 },
  ]);

  it('keeps the samples within the margin and narrows the time span', () => {
    const trimmed = trimToBlocks(profile, [[2_000, 2_400]], 500);
    expect(sampleTimestamps(trimmed)).toEqual([1_500, 2_000, 2_400]);
    expect(trimmed).toMatchObject({ startTime: 1_500, endTime: 2_900 });
    expect(names(trimmed)).toEqual(['(root)', 'before', 'handler', 'now', 'run']);
    // a valid tree: every child exists and hit counts match the kept samples
    const ids = new Set(trimmed.nodes.map(({ id }) => id));
    expect(trimmed.nodes.flatMap(({ children = [] }) => children).every((id) => ids.has(id))).toBe(
      true
    );
    expect(trimmed.nodes.reduce((sum, { hitCount = 0 }) => sum + hitCount, 0)).toBe(3);
  });

  it('marks samples dropped between distant blocks so timelines show the gap', () => {
    const trimmed = trimToBlocks(
      profile,
      [
        [2_000, 2_400],
        [8_000, 8_000],
      ],
      500
    );
    const leafNames = trimmed.samples.map(
      (leaf) => trimmed.nodes.find(({ id }) => id === leaf)?.callFrame.functionName
    );
    expect(leafNames).toEqual(['before', 'now', 'now', TRIMMED_FRAME, 'spin']);
    // the gap starts where the first dropped sample was taken
    expect(sampleTimestamps(trimmed)).toEqual([1_500, 2_000, 2_400, 5_000, 8_000]);
    expect(trimmed).toMatchObject({ startTime: 1_500, endTime: 8_500 });
  });

  it('survives a JSON round trip, as written', () => {
    const trimmed = trimToBlocks(profile, [[2_000, 2_400]], 0);
    expect(JSON.parse(JSON.stringify(trimmed))).toEqual(trimmed);
    expect(sampleTimestamps(trimmed)).toEqual([2_000, 2_400]);
  });
});

describe('sanitizeLocation', () => {
  it('keeps repo-relative paths and node specifiers, and reduces others to basenames', () => {
    expect(sanitizeLocation('file:///kibana/src/a.ts?x', 3, ROOT)).toBe('src/a.ts:3');
    expect(sanitizeLocation('node:fs', 0, ROOT)).toBe('node:fs');
    expect(sanitizeLocation('/home/user/secret/b.js', 1, ROOT)).toBe('b.js:1');
    expect(sanitizeLocation('', 1, ROOT)).toBeUndefined();
  });
});
