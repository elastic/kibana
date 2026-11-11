/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs';
import path from 'node:path';
import { summarizeProfile, type SummarizableProfile } from './profile_summary';
import { MAX_LOCATION_BYTES, MAX_NAME_BYTES } from './sanitize';

const ROOT = '/kibana';

/** Where each test function lives: zod in node_modules, Kibana in src/, x-pack/, or node_modules/@kbn/. */
const urlOf = (name: string): string => {
  if (name.startsWith('(')) {
    return '';
  }
  if (name.startsWith('node:')) {
    return name;
  }
  if (name.startsWith('zod')) {
    return `file://${ROOT}/node_modules/zod/v4/core/${name}.cjs`;
  }
  if (name.startsWith('kbn')) {
    return `file://${ROOT}/node_modules/@kbn/workflows/spec/${name}.js`;
  }
  if (name.startsWith('xpack')) {
    return `file://${ROOT}/x-pack/plugins/${name}.ts`;
  }
  return `file://${ROOT}/src/${name}.ts`;
};

interface FrameSpec {
  name: string;
  url?: string;
  lineNumber?: number;
}

/** Builds a `.cpuprofile`, one sample per stack; stacks are listed leaf first. */
const buildProfile = (
  stacks: Array<Array<string | FrameSpec>>,
  deltaUs = 10_000
): SummarizableProfile => {
  const nodes: Array<{
    id: number;
    callFrame: { functionName: string; url: string; lineNumber: number };
    children?: number[];
  }> = [{ id: 1, callFrame: { functionName: '(root)', url: '', lineNumber: -1 } }];

  const leafOf = (stack: Array<string | FrameSpec>): number => {
    let parent = nodes[0];
    for (const item of [...stack].reverse()) {
      const spec: FrameSpec = typeof item === 'string' ? { name: item } : item;
      const url = spec.url ?? urlOf(spec.name);
      const lineNumber = spec.lineNumber ?? (spec.name.startsWith('(') ? -1 : 9);
      let node = nodes.find(
        ({ id, callFrame }) =>
          callFrame.functionName === spec.name &&
          callFrame.url === url &&
          callFrame.lineNumber === lineNumber &&
          parent.children?.includes(id)
      );
      if (!node) {
        node = {
          id: nodes.length + 1,
          callFrame: { functionName: spec.name, url, lineNumber },
        };
        nodes.push(node);
        parent.children = [...(parent.children ?? []), node.id];
      }
      parent = node;
    }
    return parent.id;
  };

  return {
    nodes,
    startTime: 0,
    endTime: stacks.length * deltaUs,
    samples: stacks.map(leafOf),
    timeDeltas: stacks.map(() => deltaUs),
  };
};

describe('summarizeProfile', () => {
  const zod = ['zodInit', 'zodInit', 'zodSchema'];
  const profile = buildProfile([
    ...Array.from({ length: 6 }, () => [...zod, 'generateStepSchema', 'handler']),
    ...Array.from({ length: 2 }, () => ['(garbage collector)', ...zod, 'generateStepSchema']),
    ['kbnConnectors', 'handler'],
    ['zodParse'],
    ['(idle)'],
    ['(program)'],
  ]);

  it('summarises busy call frames and the Kibana code they were reached from', () => {
    const summary = summarizeProfile(profile, { root: ROOT });
    expect(summary.samples).toBe(11);
    expect(summary.frames).toEqual([
      {
        name: 'zodInit',
        location: 'node_modules/zod/v4/core/zodInit.cjs:10',
        percent: 54.5,
      },
      {
        name: '(garbage collector)',
        percent: 18.2,
      },
    ]);
    expect(summary.kibanaFrames).toEqual([
      {
        name: 'generateStepSchema',
        location: 'src/generateStepSchema.ts:10',
        percent: 72.7,
        callers: [{ name: 'handler', location: 'src/handler.ts:10' }],
      },
      {
        name: 'kbnConnectors',
        location: 'node_modules/@kbn/workflows/spec/kbnConnectors.js:10',
        percent: 9.1,
        callers: [{ name: 'handler', location: 'src/handler.ts:10' }],
      },
    ]);
    expect(summary.topKibanaFrame).toEqual({
      location: 'src/generateStepSchema.ts:10',
      percent: 72.7,
    });
  });

  it('attributes a hot Kibana call frame to its heaviest caller stack, not the first one seen', () => {
    const summary = summarizeProfile(
      buildProfile([
        ['zodInit', 'hotLeaf', 'rareCaller'],
        ...Array.from({ length: 3 }, () => ['zodInit', 'hotLeaf', 'hotCaller']),
      ]),
      { root: ROOT }
    );
    expect(summary.kibanaFrames[0]).toEqual({
      name: 'hotLeaf',
      location: 'src/hotLeaf.ts:10',
      percent: 100,
      callers: [{ name: 'hotCaller', location: 'src/hotCaller.ts:10' }],
    });
  });

  it('counts (program) as busy but not a call frame, keeps GC as a call frame, and ignores (idle)', () => {
    const summary = summarizeProfile(
      buildProfile([['(idle)'], ['(idle)'], ['(program)'], ['(garbage collector)']]),
      { root: ROOT }
    );
    expect(summary.samples).toBe(2);
    expect(summary.frames).toEqual([{ name: '(garbage collector)', percent: 50 }]);
    expect(summary.kibanaFrames).toEqual([]);
    expect(summary.topKibanaFrame).toBeUndefined();
  });

  describe('in-block window (inBlockUntilUs)', () => {
    it('leaves out samples after inBlockUntilUs and includes a sample exactly at inBlockUntilUs', () => {
      // Samples at 10_000, 20_000, 30_000, 40_000 µs.
      const windowed = buildProfile([
        ['earlyWork'],
        ['boundaryWork'],
        ['lateAfterBlock'],
        ['lateAfterBlock'],
      ]);
      const summary = summarizeProfile(windowed, { root: ROOT, inBlockUntilUs: 20_000 });
      expect(summary.samples).toBe(2);
      expect(summary.kibanaFrames.map(({ name }) => name)).toEqual(['boundaryWork', 'earlyWork']);
    });

    it('returns samples: 0 and empty lists when every busy sample falls after inBlockUntilUs', () => {
      const windowed = buildProfile([['(idle)'], ['lateWork'], ['lateWork']]);
      const summary = summarizeProfile(windowed, { root: ROOT, inBlockUntilUs: 10_000 });
      expect(summary).toEqual({
        samples: 0,
        frames: [],
        kibanaFrames: [],
      });
    });
  });

  it('caps frames at 2, kibanaFrames at 3, callers at 2, string lengths at MAX_NAME_BYTES / MAX_LOCATION_BYTES, and breaks ties by location', () => {
    const longName = 'fn_' + 'a'.repeat(100);
    const longPath = `file://${ROOT}/src/${'segment/'.repeat(15)}deep_kibana.ts`;
    const tiedProfile = buildProfile([
      ['leafB'],
      ['leafA'],
      ['leafC'],
      [
        { name: longName, url: longPath, lineNumber: 0 },
        'callerOne',
        'callerTwo',
        'callerThreeDropped',
      ],
    ]);
    const summary = summarizeProfile(tiedProfile, { root: ROOT });
    expect(summary.frames).toHaveLength(2);
    expect(summary.kibanaFrames).toHaveLength(3);
    // All 4 leaves have 1 sample each; sorted by uncut repo-relative location: src/leafA.ts:10, src/leafB.ts:10, src/leafC.ts:10, src/segment/.../deep_kibana.ts:1.
    expect(summary.frames.map(({ name }) => name)).toEqual(['leafA', 'leafB']);
    expect(summary.kibanaFrames.map(({ name }) => name)).toEqual(['leafA', 'leafB', 'leafC']);

    const longOnly = summarizeProfile(
      buildProfile([
        [
          { name: longName, url: longPath, lineNumber: 0 },
          'callerOne',
          'callerTwo',
          'callerThreeDropped',
        ],
      ]),
      { root: ROOT }
    );
    expect(Buffer.byteLength(JSON.stringify(longOnly.kibanaFrames[0].name).slice(1, -1))).toBe(
      MAX_NAME_BYTES
    );
    expect(
      Buffer.byteLength(JSON.stringify(longOnly.kibanaFrames[0].location!).slice(1, -1))
    ).toBeLessThanOrEqual(MAX_LOCATION_BYTES);
    expect(longOnly.kibanaFrames[0].location!.startsWith('…')).toBe(true);
    expect(longOnly.kibanaFrames[0].callers).toEqual([
      { name: 'callerOne', location: 'src/callerOne.ts:10' },
      { name: 'callerTwo', location: 'src/callerTwo.ts:10' },
    ]);
  });

  it('keeps only Kibana callers, skipping non-Kibana frames like processTicksAndRejections or third-party code between them', () => {
    const summary = summarizeProfile(
      buildProfile([
        [
          'zodParse',
          'kibanaStep',
          {
            name: 'processTicksAndRejections',
            url: 'node:internal/process/task_queues',
            lineNumber: 71,
          },
          'zodHelper',
          'xpackCallerOne',
          { name: 'runInAsyncScope', url: 'node:async_hooks', lineNumber: 199 },
          'kbnCallerTwo',
        ],
      ]),
      { root: ROOT }
    );
    expect(summary.kibanaFrames).toEqual([
      {
        name: 'kibanaStep',
        location: 'src/kibanaStep.ts:10',
        percent: 100,
        callers: [
          { name: 'xpackCallerOne', location: 'x-pack/plugins/xpackCallerOne.ts:10' },
          { name: 'kbnCallerTwo', location: 'node_modules/@kbn/workflows/spec/kbnCallerTwo.js:10' },
        ],
      },
    ]);
  });

  it('counts caller chains by value so distinct full stacks with the same Kibana caller chain sum together', () => {
    // Stack A and Stack B differ in their non-Kibana intermediate frames, so they are distinct
    // nodes in the profile tree, but both reduce to the Kibana caller chain sharedCallerOne <- sharedCallerTwo.
    // Together they have 2 samples (1 + 1), beating singleCaller's 1 sample.
    const summary = summarizeProfile(
      buildProfile([
        ['targetLeaf', 'singleCallerA', 'singleCallerB'],
        ['targetLeaf', 'zodInit', 'sharedCallerOne', 'sharedCallerTwo'],
        ['targetLeaf', 'zodParse', 'sharedCallerOne', 'sharedCallerTwo'],
      ]),
      { root: ROOT }
    );
    expect(summary.kibanaFrames[0]).toEqual({
      name: 'targetLeaf',
      location: 'src/targetLeaf.ts:10',
      percent: 100,
      callers: [
        { name: 'sharedCallerOne', location: 'src/sharedCallerOne.ts:10' },
        { name: 'sharedCallerTwo', location: 'src/sharedCallerTwo.ts:10' },
      ],
    });
  });

  it('matches Kibana call frames before applying the location length limit', () => {
    const longKbnUrl = `file://${ROOT}/node_modules/@kbn/some-very-long-package-name/target/server/${'nested_folder/'.repeat(
      10
    )}handler.js`;
    const summary = summarizeProfile(
      buildProfile([[{ name: 'deepHandler', url: longKbnUrl, lineNumber: 29 }]]),
      { root: ROOT }
    );
    expect(summary.kibanaFrames).toHaveLength(1);
    expect(summary.kibanaFrames[0].name).toBe('deepHandler');
    // The truncated location lost its `node_modules/@kbn/` prefix because keep: 'end' kept the tail,
    // yet it was still recognised as a Kibana frame.
    expect(summary.kibanaFrames[0].location!.startsWith('…')).toBe(true);
    expect(summary.kibanaFrames[0].location!.endsWith('/handler.js:30')).toBe(true);
    expect(summary.topKibanaFrame).toEqual({
      location: summary.kibanaFrames[0].location,
      percent: 100,
    });
  });

  it('omits topKibanaFrame when the profile has no Kibana call frames', () => {
    const summary = summarizeProfile(buildProfile([['zodInit'], ['zodParse']]), { root: ROOT });
    expect(summary.samples).toBe(2);
    expect(summary.frames).toHaveLength(2);
    expect(summary.kibanaFrames).toEqual([]);
    expect(summary.topKibanaFrame).toBeUndefined();
  });

  it('summarises the real Kibana plugin-setup fixture and resolves Kibana frames under src/ and x-pack/', () => {
    const fixturePath = path.join(__dirname, '__fixtures__', 'plugin_setup_window.json');
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as SummarizableProfile;
    const summary = summarizeProfile(fixture, { root: ROOT });

    expect(summary.samples).toBe(200);
    expect(summary.frames).toHaveLength(2);
    expect(summary.kibanaFrames).toHaveLength(3);
    for (const frame of summary.kibanaFrames) {
      expect(frame.location).toMatch(/^(src\/|x-pack\/|node_modules\/@kbn\/|…)/);
      expect(frame.callers.length).toBeLessThanOrEqual(2);
      for (const caller of frame.callers) {
        expect(caller.location).toMatch(/^(src\/|x-pack\/|node_modules\/@kbn\/|…)/);
      }
    }
    expect(summary.topKibanaFrame).toEqual({
      location: summary.kibanaFrames[0].location,
      percent: summary.kibanaFrames[0].percent,
    });
  });
});
