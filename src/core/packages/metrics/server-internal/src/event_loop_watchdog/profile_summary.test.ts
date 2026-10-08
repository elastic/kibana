/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  formatSummary,
  sanitizeLocation,
  summarizeProfile,
  type CpuProfile,
} from './profile_summary';

const ROOT = '/kibana';

/** Where each test function lives: zod in node_modules, Kibana in src/ or node_modules/@kbn/. */
const urlOf = (name: string) =>
  name.startsWith('(')
    ? ''
    : name.startsWith('zod')
    ? `file://${ROOT}/node_modules/zod/v4/core/${name}.cjs`
    : name.startsWith('kbn')
    ? `file://${ROOT}/node_modules/@kbn/workflows/spec/${name}.js`
    : `file://${ROOT}/src/${name}.ts`;

/** Builds a `.cpuprofile`, one sample per stack; stacks are listed leaf first. */
const buildProfile = (stacks: string[][]): CpuProfile => {
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
          callFrame: { functionName: name, url: urlOf(name), lineNumber: 9, columnNumber: 0 },
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
    endTime: stacks.length * 10_000,
    samples: stacks.map(leafOf),
    timeDeltas: stacks.map(() => 10_000),
  };
};

describe('summarizeProfile', () => {
  const zod = ['zodInit', 'zodInit', 'zodSchema'];
  const profile = buildProfile([
    ...Array.from({ length: 6 }, () => [...zod, 'generateStepSchema', 'handler']),
    ...Array.from({ length: 2 }, () => ['(garbage collector)', ...zod, 'generateStepSchema']),
    ['kbnConnectors', 'handler'],
    ['zodParse'], // no Kibana frame at all
    ['(idle)'],
    ['(program)'],
  ]);

  it('summarises busy frames, and the Kibana code they were reached from', () => {
    const summary = summarizeProfile(profile, ROOT);
    expect(summary.samples).toBe(11); // (idle) is not busy; (program) is
    expect(summary.frames[0]).toEqual({
      name: 'zodInit',
      location: 'node_modules/zod/v4/core/zodInit.cjs:10',
      samples: 6,
      percent: 54.5,
      callers: [
        'zodInit (node_modules/zod/v4/core/zodInit.cjs:10)',
        'zodSchema (node_modules/zod/v4/core/zodSchema.cjs:10)',
        'generateStepSchema (src/generateStepSchema.ts:10)',
      ],
    });
    expect(summary.kibanaFrames).toEqual([
      {
        name: 'generateStepSchema',
        location: 'src/generateStepSchema.ts:10',
        samples: 8,
        percent: 72.7,
        // only Kibana callers, for context
        callers: ['handler (src/handler.ts:10)'],
      },
      {
        // Kibana packages live under node_modules/@kbn/ in the distributable
        name: 'kbnConnectors',
        location: 'node_modules/@kbn/workflows/spec/kbnConnectors.js:10',
        samples: 1,
        percent: 9.1,
        callers: ['handler (src/handler.ts:10)'],
      },
    ]);
  });

  it('attributes a hot frame to its heaviest caller stack, not the first one seen', () => {
    const summary = summarizeProfile(
      buildProfile([
        ['zodInit', 'rarePath'],
        ...Array.from({ length: 3 }, () => ['zodInit', 'hotPath']),
      ]),
      ROOT
    );
    expect(summary.frames[0].callers).toEqual(['hotPath (src/hotPath.ts:10)']);
    expect(summary.kibanaFrames[0]).toMatchObject({ name: 'hotPath', samples: 3 });
  });

  it('formats a single readable line', () => {
    const summary = summarizeProfile(profile, ROOT);
    expect(
      formatSummary(
        summary,
        { blockedMs: 3_204, profiledAfterMs: 2_010, profilerStartMs: 704 },
        1,
        { file: '/diag/x.cpuprofile' }
      )
    ).toBe(
      'Event loop block profile #1: block ~3204ms (profiled after ~2010ms, profiler start took ~704ms), 11 samples. ' +
        'Top: 54.5% zodInit (node_modules/zod/v4/core/zodInit.cjs:10) <- zodInit (node_modules/zod/v4/core/zodInit.cjs:10) <- zodSchema (node_modules/zod/v4/core/zodSchema.cjs:10) <- generateStepSchema (src/generateStepSchema.ts:10); ' +
        '18.2% (garbage collector) <- zodInit (node_modules/zod/v4/core/zodInit.cjs:10) <- zodInit (node_modules/zod/v4/core/zodInit.cjs:10) <- zodSchema (node_modules/zod/v4/core/zodSchema.cjs:10); ' +
        '9.1% kbnConnectors (node_modules/@kbn/workflows/spec/kbnConnectors.js:10) <- handler (src/handler.ts:10). ' +
        'Kibana code: 72.7% generateStepSchema (src/generateStepSchema.ts:10) <- handler (src/handler.ts:10); ' +
        '9.1% kbnConnectors (node_modules/@kbn/workflows/spec/kbnConnectors.js:10) <- handler (src/handler.ts:10). ' +
        'File: /diag/x.cpuprofile'
    );
    expect(
      formatSummary(summary, { blockedMs: 2_500, profiledAfterMs: 2_000 }, 2, {
        notWritten: 'file limit (100) reached',
      })
    ).toMatch(
      /^Event loop block profile #2: block ~2500ms \(profiled after ~2000ms\), .* Not written: file limit \(100\) reached\.$/
    );
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
