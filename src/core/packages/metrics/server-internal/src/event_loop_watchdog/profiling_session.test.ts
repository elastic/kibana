/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ProfilingSession, toLabels, type PprofTime } from './profiling_session';
import { MAX_KEPT_PROFILES, MAX_SESSION_MS, SAMPLING_INTERVAL_US } from './types';

const S = 1_000_000;

describe('ProfilingSession', () => {
  let now: number;
  let time: jest.Mocked<PprofTime>;
  let params: ConstructorParameters<typeof ProfilingSession>[0];
  let session: ProfilingSession;

  beforeEach(() => {
    now = 1_000 * S;
    time = {
      start: jest.fn(),
      stop: jest.fn(() => ({ id: Math.random() } as unknown as ReturnType<PprofTime['stop']>)),
      // the generic signature cannot be inferred by jest.fn
      runWithContext: jest.fn((_context: object, fn: () => unknown) =>
        fn()
      ) as unknown as jest.Mocked<PprofTime>['runWithContext'],
    };
    params = {
      time,
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

  it('publishes the profiler start as a rotation so its pause is not reported as a block', () => {
    expect(params.markRotation).toHaveBeenNthCalledWith(1, 'start', now);
    expect(params.markRotation).toHaveBeenNthCalledWith(2, 'end', now);
  });

  it('samples continuously at 99Hz with labels', () => {
    expect(time.start).toHaveBeenCalledWith(
      expect.objectContaining({
        intervalMicros: SAMPLING_INTERVAL_US,
        withContexts: true,
        useCPED: true,
      })
    );
    expect(session.isActive).toBe(true);
  });

  it('rotates every 60s, discarding windows without blocks', () => {
    advance(59);
    expect(time.stop).not.toHaveBeenCalled();
    advance(1);
    expect(time.stop).toHaveBeenCalledWith(true, undefined, expect.any(Array));
    expect(params.onKeep).not.toHaveBeenCalled();
    expect(params.markRotation).toHaveBeenNthCalledWith(3, 'start', now);
    expect(params.markRotation).toHaveBeenNthCalledWith(4, 'end', now);
  });

  it('keeps a flagged window, rotating it early once it is 10s old', () => {
    advance(2, 1);
    expect(time.stop).not.toHaveBeenCalled();
    advance(8, 1);
    expect(time.stop).toHaveBeenCalledWith(true, expect.any(Function), expect.any(Array));
    expect(params.onKeep).toHaveBeenCalledWith(
      time.stop.mock.results[0].value,
      { startUs: 1_000 * S, endUs: 1_010 * S },
      `1/${MAX_KEPT_PROFILES}`
    );
    // the next window is only kept if another block is flagged
    advance(60, 1);
    expect(params.onKeep).toHaveBeenCalledTimes(1);
  });

  it('labels samples with their timestamp and the context labels', () => {
    advance(10, 1);
    const generateLabels = time.stop.mock.calls[0][1]!;
    expect(
      generateLabels({
        node: {} as never,
        context: { context: { context_outer: 'a:b' }, timestamp: 42n },
      })
    ).toEqual({ context_outer: 'a:b', timestamp_us: 42 });
    expect(generateLabels({ node: {} as never })).toEqual({});
  });

  it('ends after the profile limit', () => {
    for (let i = 0; i < MAX_KEPT_PROFILES; i++) advance(10, i + 1);
    expect(params.onKeep).toHaveBeenCalledTimes(MAX_KEPT_PROFILES);
    expect(time.stop).toHaveBeenLastCalledWith(false);
    expect(session.isActive).toBe(false);
    advance(60, MAX_KEPT_PROFILES + 1);
    expect(params.onKeep).toHaveBeenCalledTimes(MAX_KEPT_PROFILES);
  });

  it('ends after the time limit', () => {
    now += MAX_SESSION_MS * 1000;
    session.tick(0);
    expect(time.stop).toHaveBeenCalledWith(false);
    expect(session.isActive).toBe(false);
  });

  it('ends when a rotation fails, still publishing its end', () => {
    time.stop.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    advance(60);
    expect(params.markRotation).toHaveBeenCalledWith('end', now);
    expect(session.isActive).toBe(false);
  });

  it('labels work only while active and labels are supported', () => {
    const run = jest.fn(() => 'result');
    expect(session.runWithLabels({ type: 'task manager', name: 'run x', id: '1' }, run)).toBe(
      'result'
    );
    expect(time.runWithContext).toHaveBeenLastCalledWith(
      { context_outer: 'task manager:run x' },
      run
    );
    session.end('test');
    time.runWithContext.mockClear();
    session.runWithLabels({ type: 'a' }, run);
    expect(time.runWithContext).not.toHaveBeenCalled();
  });

  it('continues without labels when the runtime lacks AsyncContextFrame', () => {
    time.runWithContext.mockImplementationOnce(() => {
      throw new Error('Can only use runWithContext with AsyncContextFrame');
    });
    const other = new ProfilingSession(params);
    other.start(0);
    time.runWithContext.mockClear();
    expect(other.runWithLabels({ type: 'a' }, () => 1)).toBe(1);
    expect(time.runWithContext).not.toHaveBeenCalled();
  });
});

describe('toLabels', () => {
  it('uses the outermost and innermost context, never ids', () => {
    expect(
      toLabels({
        type: 'task manager',
        name: 'run workflow:run',
        id: 'task-id',
        child: { type: 'workflow step', name: 'test.cpuSpin', id: 'step-id' },
      })
    ).toEqual({
      context_outer: 'task manager:run workflow:run',
      context_inner: 'workflow step:test.cpuSpin',
    });
    expect(toLabels({ id: 'only-id' })).toEqual({});
  });
});
