/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const mockCalls: string[] = [];
const mockStartCpuProfile = jest.fn(() => {
  mockCalls.push('start');
  return { stop: () => '{}' };
});
jest.mock('node:v8', () => ({
  __esModule: true,
  default: {
    setFlagsFromString: (flag: string) => mockCalls.push(flag),
    startCpuProfile: () => mockStartCpuProfile(),
  },
}));

import { loggerMock } from '@kbn/logging-mocks';
import {
  ProfilingSession,
  createV8CpuProfiler,
  type CpuProfiler,
  type ProfilingSessionParams,
} from './profiling_session';
import { MAX_SESSION_MS } from './types';

const S = 1_000_000;

describe('ProfilingSession', () => {
  let now: number;
  let profiles: Array<{ id: number; stop: jest.Mock }>;
  let profiler: jest.Mocked<CpuProfiler>;
  let params: ProfilingSessionParams & { onKeep: jest.Mock; markRotation: jest.Mock };
  let session: ProfilingSession;

  beforeEach(() => {
    now = 1_000 * S;
    profiles = [];
    profiler = {
      start: jest.fn(() => {
        const id = profiles.length + 1;
        const profile = { id, stop: jest.fn(() => `profile-${id}`) };
        profiles.push(profile);
        return profile;
      }),
    };
    params = {
      profiler,
      logger: loggerMock.create(),
      now: () => now,
      markRotation: jest.fn(),
      onKeep: jest.fn(),
    };
    session = new ProfilingSession(params);
    session.start(0);
  });

  const advance = (seconds: number, blocks = 0) => {
    now += seconds * S;
    session.tick(blocks);
  };

  it('publishes the profiler cold start as a rotation so its pause is not reported as a block', () => {
    expect(profiler.start).toHaveBeenCalledTimes(1);
    expect(params.markRotation).toHaveBeenNthCalledWith(1, 'start', now);
    expect(params.markRotation).toHaveBeenNthCalledWith(2, 'end', now);
    expect(session.isActive).toBe(true);
  });

  it('rotates every 60s by starting the next profile before stopping the current one', () => {
    advance(59);
    expect(profiler.start).toHaveBeenCalledTimes(1);
    advance(1);
    expect(profiler.start).toHaveBeenCalledTimes(2);
    expect(profiles[0].stop).toHaveBeenCalledTimes(1);
    // overlap: the next profile was already running when the current one stopped
    expect(profiler.start.mock.invocationCallOrder[1]).toBeLessThan(
      profiles[0].stop.mock.invocationCallOrder[0]
    );
    expect(params.onKeep).not.toHaveBeenCalled();
    expect(params.markRotation).toHaveBeenNthCalledWith(3, 'start', now);
    expect(params.markRotation).toHaveBeenNthCalledWith(4, 'end', now);
  });

  it('keeps a flagged window, rotating it early once it is 10s old', () => {
    advance(2, 1);
    expect(profiles[0].stop).not.toHaveBeenCalled();
    advance(8, 1);
    expect(params.onKeep).toHaveBeenCalledWith({
      json: 'profile-1',
      stoppedAtUs: now,
      window: { startUs: 1_000 * S, endUs: 1_010 * S },
      kept: 1,
    });
    // the next window is only kept if another block is flagged
    advance(60, 1);
    expect(params.onKeep).toHaveBeenCalledTimes(1);
  });

  it('keeps flagged windows for the whole session: the worker bounds the files written', () => {
    for (let i = 0; i < 500; i++) advance(10, i + 1);
    expect(params.onKeep).toHaveBeenCalledTimes(500);
    expect(params.onKeep).toHaveBeenLastCalledWith(expect.objectContaining({ kept: 500 }));
    expect(profiler.start).toHaveBeenCalledTimes(501);
    expect(session.isActive).toBe(true);
  });

  it('ends after the time limit, stopping the profile and publishing the stop as a rotation', () => {
    now += MAX_SESSION_MS * 1000;
    session.tick(0);
    expect(profiles[0].stop).toHaveBeenCalledTimes(1);
    expect(params.markRotation).toHaveBeenLastCalledWith('end', now);
    expect(params.markRotation).toHaveBeenCalledTimes(4);
    expect(session.isActive).toBe(false);
  });

  it('keeps a last flagged window when the time limit is reached', () => {
    advance(MAX_SESSION_MS / 1000 - 5);
    now += 5 * S;
    session.tick(1);
    expect(params.onKeep).toHaveBeenCalledTimes(1);
    expect(profiles.every(({ stop }) => stop.mock.calls.length === 1)).toBe(true);
    expect(session.isActive).toBe(false);
  });

  it('ends when the next profile fails to start, stopping the one still running', () => {
    profiler.start.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    advance(60);
    expect(profiles[0].stop).toHaveBeenCalledTimes(1);
    expect(params.markRotation).toHaveBeenCalledWith('end', now);
    expect(session.isActive).toBe(false);
  });

  it('ends when stopping fails, stopping the profile that already took over', () => {
    profiles[0].stop.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    advance(60);
    expect(profiles[1].stop).toHaveBeenCalledTimes(1);
    expect(session.isActive).toBe(false);
  });
});

describe('createV8CpuProfiler', () => {
  beforeEach(() => {
    mockCalls.length = 0;
    jest.clearAllMocks();
  });

  it('sets the sampling interval only while creating the profiler, then restores the default', () => {
    const profiler = createV8CpuProfiler();
    profiler.start();
    profiler.start();
    expect(mockCalls).toEqual([
      '--cpu-profiler-sampling-interval=10101',
      'start',
      '--cpu-profiler-sampling-interval=1000',
      'start',
    ]);
  });

  it('restores the default even if starting fails, and sets it again on the next attempt', () => {
    mockStartCpuProfile.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const profiler = createV8CpuProfiler();
    expect(() => profiler.start()).toThrow('boom');
    profiler.start();
    expect(mockCalls).toEqual([
      '--cpu-profiler-sampling-interval=10101',
      '--cpu-profiler-sampling-interval=1000',
      '--cpu-profiler-sampling-interval=10101',
      'start',
      '--cpu-profiler-sampling-interval=1000',
    ]);
  });
});
