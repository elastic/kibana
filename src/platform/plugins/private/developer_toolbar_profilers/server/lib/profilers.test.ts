/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InspectorSession } from './inspector';
import {
  startCpuProfile,
  startMemoryProfile,
  stopCpuProfile,
  stopMemoryProfile,
} from './profilers';

function createMockSession() {
  const post = jest.fn();
  const session = { post, disconnect: jest.fn() } as unknown as InspectorSession;
  return { post, session };
}

describe('profilers', () => {
  it('starts a cpu profile', async () => {
    const { post, session } = createMockSession();
    await startCpuProfile(session);
    expect(post.mock.calls).toEqual([['Profiler.enable'], ['Profiler.start']]);
  });

  it('stops a cpu profile and returns it', async () => {
    const { post, session } = createMockSession();
    const profile = { nodes: [], startTime: 0, endTime: 1 };
    post.mockResolvedValueOnce({ profile });

    await expect(stopCpuProfile(session)).resolves.toBe(profile);
    expect(post.mock.calls).toEqual([['Profiler.stop'], ['Profiler.disable']]);
  });

  it('starts a memory profile', async () => {
    const { post, session } = createMockSession();
    await startMemoryProfile(session);
    expect(post.mock.calls).toEqual([['HeapProfiler.enable'], ['HeapProfiler.startSampling']]);
  });

  it('stops a memory profile and returns it', async () => {
    const { post, session } = createMockSession();
    const profile = { head: {}, samples: [] };
    post.mockResolvedValueOnce({ profile });

    await expect(stopMemoryProfile(session)).resolves.toBe(profile);
    expect(post.mock.calls).toEqual([
      ['HeapProfiler.getSamplingProfile'],
      ['HeapProfiler.stopSampling'],
      ['HeapProfiler.disable'],
    ]);
  });
});
