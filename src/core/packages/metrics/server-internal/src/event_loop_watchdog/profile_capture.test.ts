/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ProfileCapture,
  prepareProfile,
  type CpuProfile,
  type InspectorSession,
} from './profile_capture';
import { SAMPLING_INTERVAL_US } from './constants';

const profile: CpuProfile = {
  nodes: [{ id: 1, callFrame: { functionName: '(root)' } }],
  startTime: 0,
  endTime: 1000,
  samples: [1],
};

describe('ProfileCapture', () => {
  let session: jest.Mocked<InspectorSession>;

  beforeEach(() => {
    session = {
      connectToMainThread: jest.fn(),
      disconnect: jest.fn(),
      post: jest.fn(async (method: string) =>
        method === 'Profiler.stop' ? { profile } : {}
      ) as jest.Mocked<InspectorSession>['post'],
    };
  });

  it('connects to the main thread and starts the profiler in one round trip', async () => {
    const capture = new ProfileCapture(() => session);
    expect(session.connectToMainThread).toHaveBeenCalledTimes(1);
    await capture.start();
    expect(session.post.mock.calls).toEqual([
      ['Profiler.enable'],
      ['Profiler.setSamplingInterval', { interval: SAMPLING_INTERVAL_US }],
      ['Profiler.start'],
    ]);
  });

  it.each(['Profiler.enable', 'Profiler.setSamplingInterval', 'Profiler.start'])(
    'fails to start when %s fails',
    async (failing) => {
      session.post.mockImplementation(async (method: string) => {
        if (method === failing) {
          throw new Error(`${failing} failed`);
        }
        return {};
      });
      await expect(new ProfileCapture(() => session).start()).rejects.toThrow(`${failing} failed`);
    }
  );

  it('stops the profiler, returns the profile and ends the session', async () => {
    const capture = new ProfileCapture(() => session);
    await capture.start();
    await expect(capture.stop()).resolves.toBe(profile);
    expect(session.disconnect).toHaveBeenCalledTimes(1);
  });

  it('ends the session when the stop fails', async () => {
    session.post.mockRejectedValueOnce(new Error('stop failed'));
    const capture = new ProfileCapture(() => session);
    await expect(capture.stop()).rejects.toThrow('stop failed');
    expect(session.disconnect).toHaveBeenCalledTimes(1);
  });

  it('disconnects once', () => {
    const capture = new ProfileCapture(() => session);
    capture.dispose();
    capture.dispose();
    expect(session.disconnect).toHaveBeenCalledTimes(1);
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

const urlAfter = (url: string) =>
  prepareProfile(
    { nodes: [node(1, 'f', url)], startTime: 0, endTime: 0, samples: [1], timeDeltas: [0] },
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
    expect(prepareProfile(fileProfile(), ROOT).nodes[2]).toHaveProperty('positionTicks', [
      { line: 1, ticks: 2 },
    ]);
  });

  it('changes the kept nodes in place instead of copying them', () => {
    const input = fileProfile();
    const prepared = prepareProfile(input, ROOT);
    expect(prepared.nodes.filter((kept) => !input.nodes.includes(kept))).toEqual([]);
  });

  it('keeps startTime and endTime in order when every sample is idle', () => {
    const prepared = prepareProfile(
      { ...fileProfile(), samples: [2, 2], timeDeltas: [1_500, 10] },
      ROOT
    );
    expect(prepared).toMatchObject({
      startTime: 2_500,
      endTime: 2_500,
      samples: [],
      timeDeltas: [],
    });
    expect(prepared.nodes).toEqual([]);
  });

  it.each([
    ['file:///kibana/node_modules/@kbn/core/a.js', '@kbn/core/a.js'],
    ['file:///kibana/src/core/a.js', 'src/core/a.js'],
    ['file:///kibana/x-pack/platform/a.js', 'x-pack/platform/a.js'],
    ['/kibana/src/core/a.js', 'src/core/a.js'],
    ['file:///kibana/node_modules/lodash/x.js', 'file:///kibana/node_modules/lodash/x.js'],
    ['file:///elsewhere/src/a.js', 'file:///elsewhere/src/a.js'],
    ['node:internal/timers', 'node:internal/timers'],
    ['', ''],
  ])('rewrites %j to %j', (url, expected) => {
    expect(urlAfter(url)).toBe(expected);
  });
});
