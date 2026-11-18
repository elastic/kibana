/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import os from 'node:os';
import { fileName, prepareProfile } from './profile_file';

describe('fileName', () => {
  it('names a file by phase, zero-padded block length, time, host and pid', () => {
    expect(fileName('running', 1234.6, new Date('2026-11-17T10:20:30.456Z'))).toBe(
      `event-loop-block-running-001235ms-2026-11-17T10-20-30-456Z-${os.hostname()}-${
        process.pid
      }.cpuprofile`
    );
  });
});

const ROOT = '/kibana';

const node = (id: number, functionName: string, url = '', children?: number[]) => ({
  id,
  callFrame: { functionName, url, lineNumber: 0 },
  ...(children && { children }),
});

const fileProfile = () => ({
  nodes: [
    node(1, '(root)', '', [2, 3, 5]),
    node(2, '(idle)'),
    {
      ...node(3, 'kibana', 'file:///kibana/node_modules/@kbn/core/a.js', [4]),
      positionTicks: [{ line: 1, ticks: 2 }],
    },
    node(4, 'thirdParty', 'file:///kibana/node_modules/lodash/x.js'),
    node(5, 'unsampled', 'file:///kibana/src/b.js'),
  ],
  startTime: 1_000,
  endTime: 2_000,
  samples: [3, 4, 2, 3, 2, 2],
  timeDeltas: [1_500, 10, 20, 30, 40, 50],
});

const urlAfter = (url: string | undefined) =>
  prepareProfile(
    {
      nodes: [{ id: 1, callFrame: { functionName: 'f', url } }],
      startTime: 0,
      endTime: 0,
      samples: [1],
      timeDeltas: [0],
    },
    ROOT
  ).nodes[0].callFrame.url;

describe('prepareProfile', () => {
  it('trims the lead-in and the idle tail', () => {
    const { startTime, endTime, samples, timeDeltas } = prepareProfile(fileProfile(), ROOT);
    expect({ startTime, endTime, samples, timeDeltas }).toEqual({
      startTime: 2_500,
      endTime: 2_560,
      samples: [3, 4, 2, 3],
      timeDeltas: [0, 10, 20, 30],
    });
  });

  it('keeps sampled nodes and their ancestors, with recomputed hit counts', () => {
    const { nodes } = prepareProfile(fileProfile(), ROOT);
    expect(nodes.map(({ id, children, hitCount }) => ({ id, children, hitCount }))).toEqual([
      { id: 1, children: [2, 3], hitCount: 0 },
      { id: 2, children: undefined, hitCount: 1 },
      { id: 3, children: [4], hitCount: 2 },
      { id: 4, children: undefined, hitCount: 1 },
    ]);
  });

  it('keeps positionTicks', () => {
    expect(prepareProfile(fileProfile(), ROOT).nodes.find(({ id }) => id === 3)).toHaveProperty(
      'positionTicks',
      [{ line: 1, ticks: 2 }]
    );
  });

  it('changes the kept nodes in place instead of copying them', () => {
    const input = fileProfile();
    const original = new Set<object>(input.nodes);
    const prepared = prepareProfile(input, ROOT);
    expect(prepared.nodes.filter((kept) => !original.has(kept))).toEqual([]);
  });

  it.each<[string | undefined, string | undefined]>([
    ['file:///kibana/node_modules/@kbn/core/a.js', '@kbn/core/a.js'],
    ['file:///kibana/src/core/a.js', 'src/core/a.js'],
    ['file:///kibana/x-pack/platform/a.js', 'x-pack/platform/a.js'],
    ['/kibana/src/core/a.js', 'src/core/a.js'],
    ['file:///kibana/node_modules/lodash/x.js', 'file:///kibana/node_modules/lodash/x.js'],
    ['file:///elsewhere/src/a.js', 'file:///elsewhere/src/a.js'],
    ['node:internal/timers', 'node:internal/timers'],
    ['', ''],
    [undefined, undefined],
  ])('rewrites %j to %j', (url, expected) => {
    expect(urlAfter(url)).toBe(expected);
  });
});
